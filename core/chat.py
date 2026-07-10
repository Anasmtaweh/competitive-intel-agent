import json
import logging
from core.llm import call_llm, stream_llm
from core.search import search, format_results_for_llm

logger = logging.getLogger(__name__)

CLASSIFIER_PROMPT = """You are a router.
You have a report about {company}. 

Does the report contain at least partial or closely related information to answer this query: "{query}"?

CONTEXT:
{context}

Reply exactly with the word YES or NO. 
If unsure, or if the context mentions the topics in the query at all, reply YES. Only reply NO if the query is completely foreign to the context.
"""

CHAT_PROMPT = """You are a highly professional competitive intelligence analyst for the company: {company}. 

CRITICAL PERSONA RULE: When the user uses second-person pronouns ('your', 'you', 'yourself'), they ALWAYS refer to the target company ({company}), NEVER to you as an AI assistant. Do not mention your own inference costs, training costs, or model architecture. Answer all questions from the perspective of {company}'s business and technology.

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
        # Step 1: Classification
        # Fast-path Zero-Token Heuristic: Check for keyword overlap to save tokens
        query_words = set(w.strip('?,.!') for w in query.lower().split() if len(w.strip('?,.!')) > 4)
        context_lower = report_context_str.lower()
        overlap = [w for w in query_words if w in context_lower]
        
        # If at least one significant keyword is in the context, skip the LLM and don't search
        if overlap:
            classification = "YES"
        else:
            classifier_sys_prompt = CLASSIFIER_PROMPT.format(
                company=company,
                context=report_context_str,
                query=query
            )
            classification = await call_llm(classifier_sys_prompt, temperature=0.0, max_tokens=10)
            
        classification = classification.strip().upper()
        
        # Prepare the final context
        final_context = report_context_str

        # Step 2: Live Search (if needed)
        if "YES" not in classification:
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
