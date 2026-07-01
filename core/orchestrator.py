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
