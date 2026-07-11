import json
import logging
from core.llm import call_llm, stream_llm
from core.search import search, format_results_for_llm

logger = logging.getLogger(__name__)

CLASSIFIER_PROMPT = """You are a router.
Evaluate the user's query: "{query}"

Step 1: Is this query explicitly related to business strategy, competitive intelligence, or the technology of {company}? 
If the answer is NO (e.g., it's about weather, sports, general knowledge, recipes), you MUST output exactly: OFF_TOPIC.

Step 2: If the answer is YES, check if the report contains at least partial information to answer it:
CONTEXT:
{context}
If the context has the information, output exactly: YES.
If the context lacks the information (requiring a web search), output exactly: NO.

Only output one of the three exact words (OFF_TOPIC, YES, or NO) on the final line of your response.
"""

CHAT_PROMPT = """You are a highly professional competitive intelligence analyst discussing {company}. 
Always refer to {company} by its name or in the third person. If the user says "you" or "your", assume they are asking about {company}.
When answering follow-up questions, always refer directly to your previous answers in the conversation history rather than inventing new topics.

You only answer questions about the company: {company}. 
If the user asks about anything else (e.g. recipes, general knowledge, other companies not related to the context), politely refuse and redirect them to ask about {company}.

You have been provided with the following intelligence data about {company}:

=== START OF INTELLIGENCE DATA ===
{context}
=== END OF INTELLIGENCE DATA ===

When answering the user's query, you MUST rely heavily on this intelligence data.
Whenever you use information from the data, you MUST cite the source agent or the provided search source (e.g., "According to the Risk Agent...", "Based on recent news from Source 1...").
Be concise, analytical, and objective.

If you are asked to re-evaluate or discuss the final recommendation, you MUST strictly adhere to the system's official verdict ontology: INVEST, WATCH, PARTNER, or AVOID. 
DO NOT invent new verdicts (like "Conditional Invest"). Instead, pick the closest official verdict and explain any conditions or changes in confidence within your reasoning.
"""

async def run_chat_stream(company: str, query: str, report_context_str: str, history: list[dict] = None):
    """
    Stream a chat response back to the client via SSE.
    Step 1: Classify if we need more info.
    Step 2: If NO, run a search.
    Step 3: Stream the response.
    """
    try:
        # Step 1: Classification (Always use LLM for reliable routing)
        classifier_sys_prompt = CLASSIFIER_PROMPT.format(
            company=company,
            context=report_context_str,
            query=query
        )
        classification = await call_llm(classifier_sys_prompt, temperature=0.0, max_tokens=100)
            
        classification = classification.strip().upper()
        # Ensure we only check the final decision from the chain of thought
        final_decision = classification.split('\n')[-1].strip()
        
        # Prepare the final context
        final_context = report_context_str

        # Step 2: Live Search (if needed)
        if "OFF_TOPIC" in final_decision:
            # Skip live search entirely, the Chat Agent will handle the refusal
            pass
        elif "YES" not in final_decision:
            # We don't have the answer in context. We must search.
            yield f'data: {json.dumps({"type": "status", "message": f"Searching for new information about {query}..."})}\n\n'
            
            try:
                search_results = await search(f"{company} {query}", num_results=3)
                formatted_search = format_results_for_llm(search_results)
                
                final_context += "\n\n=== ADDITIONAL LIVE SEARCH RESULTS ===\n"
                final_context += formatted_search
            except Exception as e:
                logger.error(f"Search failed during chat: {e}")
                # We append a warning to context so LLM knows search failed
                final_context += "\n\n=== ADDITIONAL LIVE SEARCH RESULTS ===\n(Search failed, no new results available)"

        # Step 3: Stream Final Answer
        chat_sys_prompt = CHAT_PROMPT.format(
            company=company,
            context=final_context
        )
        
        messages = [{"role": "system", "content": chat_sys_prompt}]
        
        if history:
            for turn in history[-6:]:
                messages.append({"role": turn["role"], "content": turn["content"]})
                
        messages.append({"role": "user", "content": query})
        
        async for chunk in stream_llm(messages=messages, temperature=0.3):
            # Encode each chunk as SSE data
            yield f'data: {json.dumps({"type": "chunk", "message": chunk})}\n\n'
            
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'
