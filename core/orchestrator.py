"""
Orchestrator — fires all research agents concurrently and streams results
using Server-Sent Events (SSE). Then runs the Verdict Agent.
"""

import asyncio
import json

from agents.business_model import business_model_agent
from agents.competitor import competitor_agent
from agents.news import news_agent
from agents.opportunity import opportunity_agent
from agents.risk import risk_agent
from agents.verdict import verdict_agent

AGENT_MAP = {
    "news": news_agent,
    "competitor": competitor_agent,
    "business_model": business_model_agent,
    "risk": risk_agent,
    "opportunity": opportunity_agent,
}


async def run_analysis(company: str):
    """
    Run the competitive analysis for the given company.
    
    Yields SSE-formatted strings as each agent completes its analysis.
    Finally, yields the verdict.
    """
    from core.llm import call_llm
    prompt = f"""Is "{company}" a real technology or AI-related company 
    that could be analyzed for competitive intelligence purposes?
    
    Reply with exactly one word: VALID if it is a real tech/AI company, startup, or technology organization.
    Reply with exactly one word: INVALID if it is a consumer brand unrelated to tech, a person's name, fictional, nonsensical, or not a real company.
    
    Reply with the single word VALID or the single word INVALID and nothing else."""
    
    try:
        import re
        # Provide plenty of max_tokens (1000) for reasoning models (like Qwen/DeepSeek) 
        # to complete their Chain of Thought blocks before outputting the final answer.
        validation_result = await call_llm(prompt, temperature=0.0, max_tokens=1000)
        
        result_clean = validation_result.upper()
        
        # Scan the entire output (including any leaked reasoning blocks) for VALID or INVALID
        matches = re.findall(r"\b(VALID|INVALID)\b", result_clean)
        
        # Extract the absolute last mentioned decision
        final_decision = matches[-1] if matches else "UNKNOWN"
        
        # Strict code-level enforcement: fail closed
        if final_decision != "VALID":
            error_event = {
                "type": "error",
                "agent": "validator",
                "message": "This tool analyzes AI and technology companies only. Please enter a valid tech company name (e.g., OpenAI, Mistral, Nvidia, Palantir)."
            }
            yield f"data: {json.dumps(error_event)}\n\n"
            return
    except Exception as e:
        pass  # If validation API fails, fail open and proceed with analysis

    queue = asyncio.Queue()
    agent_results = {}
    


    async def wrapped(name: str, func, comp: str):
        try:
            result = await func(comp)
            event = {
                "type": "agent_complete",
                "agent": name,
                **result,
            }
            await queue.put(event)
        except Exception as e:
            await queue.put({
                "type": "error",
                "agent": name,
                "message": f"Agent failed: {str(e)}"
            })

    # Fire all 5 research agents simultaneously
    tasks = [asyncio.create_task(wrapped(name, func, company)) for name, func in AGENT_MAP.items()]

    # Collect and yield results as they arrive
    for _ in range(len(AGENT_MAP)):
        event = await queue.get()
        
        # If successful, store in agent_results so verdict_agent can use it
        if event.get("type") == "agent_complete":
            agent_results[event["agent"]] = event
            
        yield f"data: {json.dumps(event)}\n\n"

    # Cleanup tasks
    await asyncio.gather(*tasks, return_exceptions=True)

    # Run the verdict agent using the collected intelligence
    try:
        verdict_result = await verdict_agent(company, agent_results)
        verdict_event = {"type": "verdict_complete", **verdict_result}
        yield f"data: {json.dumps(verdict_event)}\n\n"
    except Exception as e:
        error_event = {
            "type": "error",
            "agent": "verdict",
            "message": f"Verdict agent failed: {str(e)}"
        }
        yield f"data: {json.dumps(error_event)}\n\n"
