"""
Verdict Agent — the final synthesis step that reviews structured evidence
from all research agents to issue a final recommendation.
"""

import re
from core.llm import call_llm

def build_evidence_summary(agent_results: dict) -> str:
    """
    Constructs a structured summary of all 5 agents' metadata for the 
    Verdict Agent to reason over.
    """
    lines = []
    for agent_name in ["news", "competitor", "business_model", "risk", "opportunity"]:
        data = agent_results.get(agent_name, {})
        lines.append(f"\n[{agent_name.upper()}]")
        lines.append(f"Confidence: {data.get('confidence', 'N/A')}/10")
        lines.append(f"Evidence Quality: {data.get('evidence_quality', 'N/A')}/10")
        if data.get('missing_information'):
            lines.append(f"Missing Info: {data['missing_information']}")
        if data.get('internal_conflicts'):
            lines.append(f"Internal Conflicts: {data['internal_conflicts']}")
        if agent_name == "risk" and data.get('risks'):
            for r in data['risks']:
                lines.append(f"  Risk: {r['name']} (Impact {r['impact']}, Likelihood {r['likelihood']}, Score {r['risk_score']}, {r['severity']})")
        if agent_name == "opportunity" and data.get('opportunities'):
            for o in data['opportunities']:
                lines.append(f"  Opportunity: {o['name']} (Impact {o['impact']}, Likelihood {o['likelihood']}, Score {o['opportunity_score']}, {o['strength']})")
    return "\n".join(lines)


VERDICT_PROMPT = """You are a senior investment analyst performing evidence-based competitive intelligence analysis. 
You reason critically across structured evidence from 5 specialist analysts. Your role is NOT to summarize what they said, but to SYNTHESIZE their findings into a defensible investment recommendation.

Company under analysis: {company_name}

=== STRUCTURED EVIDENCE SUMMARY ===
{evidence_summary}

=== FULL AGENT REPORTS ===
NEWS:
{news_output}

COMPETITIVE POSITION:
{competitor_output}

BUSINESS MODEL:
{business_model_output}

RISK ANALYSIS:
{risk_output}

GROWTH OPPORTUNITIES:
{opportunity_output}

REASONING PROCESS:

STEP 1 — WEIGH EVIDENCE QUALITY & DETECT TIMELINE UPDATES:
Analyze the agents' claims. Before declaring a "conflict," you MUST check dates and math.
- TIMELINE UPDATES vs. CONFLICTS: If two agents report different figures for the same metric (e.g., $24B in March vs $30B in April), this is a TIMELINE PROGRESSION, not a contradiction. Newer data superseding older data MUST be treated as an update, not a conflict, unless both claims cannot simultaneously be true.
- PROJECTIONS VS. FACTS: Do NOT treat projections (e.g., future losses, ARR targets) as established facts. Clearly distinguish between reported facts, company guidance, and analyst estimates. Never present a forecast with the same certainty as a verified financial result.
- SOURCE TIERS: Distinguish facts from speculation. If a Tier 4 source (Reddit/YouTube) makes a claim that contradicts a Tier 1 source, you MUST explicitly state that you are dismissing the lower-quality source.

STEP 2 — DETECT GENUINE CROSS-AGENT CONFLICTS:
A genuine conflict is when agents pull toward opposite verdicts using contemporaneous, high-quality sources.
For every genuine conflict found, you MUST explicitly explain why you trust one side over the other. Do not leave conflicts unresolved unless the uncertainty is too high (which forces a WATCH verdict).

STEP 3 — IDENTIFY KEY DECISION DRIVERS & CHAIN OF REASONING:
What are the 2-3 most critical findings that drive your verdict? 
Ensure there is a clear, logical chain from evidence to consequence to conclusion (e.g., "Funding leads to compute expansion, which supports revenue growth, which strengthens the investment thesis"). Do not jump directly from raw evidence to a final conclusion without explaining the mechanism.

STEP 4 — RISK MITIGATION VS. DISMISSAL:
Do not dismiss risks aggressively. Explain how a risk is mitigated or balanced against strengths, rather than implying it no longer matters.
- LIQUIDITY VS. PROFITABILITY: Be explicitly precise with financial concepts. A major funding round reduces near-term liquidity risk, but it does NOT solve fundamental profitability or execution risks. Having capital to continue operating is fundamentally different from proving the business model is economically sustainable.

STEP 5 — VERDICT SELECTION:
- INVEST: Strong fundamentals outweigh risks, backed by high-evidence-quality sources.
- PARTNER: Interesting strategically but not investment-grade.
- AVOID: Red flags dominate, especially if backed by high-evidence-quality sources.
- WATCH: Genuine strong signals on both sides with comparable evidence quality, OR the uncertainty is too high due to poor source quality.

TONE & STYLE (CRITICAL):
Write like a senior institutional equity researcher, not promotional marketing copy.
- EVIDENCE VS. INTERPRETATION: Keep facts objective, and clearly frame your conclusions as analytical judgments derived from those facts.
- MEASURED LANGUAGE: Use highly measured, evidence-driven language (e.g., "appears to," "currently," "substantially improves," "reduces near-term concerns").
- NO ABSOLUTES: NEVER use absolute, causal, or hyperbolic statements like "undisputed leader," "insurmountable moat," "validated path to profitability," "guarantee operational runway," or "effectively neutralize." Every single claim must be cautious, evidence-driven, and defensible if challenged by an expert.

OUTPUT FORMAT (follow exactly):
VERDICT: [INVEST/PARTNER/AVOID/WATCH]
CONFIDENCE: [1-10] — [1 sentence justifying this score, explicitly referencing evidence quality, source agreement, unresolved uncertainty, and remaining assumptions. CALIBRATION RULE: Your confidence score MUST NOT exceed the average evidence_quality of the 5 agents by more than 2 points. For example, if the average evidence_quality is 5.4, your maximum confidence is 7.]
CROSS_AGENT_CONFLICTS: [Describe genuine conflicts only. Explicitly state which agent/source you trusted and WHY. Write NONE if none found.]
KEY_DECISION_DRIVERS: [2-3 findings that most influenced this verdict, citing agent names]
STRONGEST_SUPPORTING_EVIDENCE: [Best evidence FOR this verdict — name the agent and source tier]
STRONGEST_OPPOSING_EVIDENCE: [Best evidence AGAINST this verdict — name the agent and source tier]
TRADE_OFF: [One sentence: the core tension that made this verdict non-obvious]
STABILITY: [HIGH/MEDIUM/LOW]
STABILITY_REASON: [One sentence: what single piece of new information would most likely change this verdict]
WHAT_WOULD_FLIP_TO_INVEST: [condition] (CRITICAL: Only reference metrics, companies, or events that appear explicitly in the agent reports above. Do not invent thresholds or figures not grounded in the provided evidence. Write N/A if already INVEST.)
WHAT_WOULD_FLIP_TO_AVOID: [condition] (Same anti-hallucination rule as above. Write N/A if already AVOID.)
INTELLIGENCE_GAP_1: [description] | CONFIDENCE_IMPACT: +[X]
INTELLIGENCE_GAP_2: [description] | CONFIDENCE_IMPACT: +[X]
INTELLIGENCE_GAP_3: [description] | CONFIDENCE_IMPACT: +[X]
REASONING: [5 sentences of strict synthesis, using measured language and clear reasoning chains.
1: The overarching narrative. 
2: Why the main strength was weighted heavily. 
3: How the main risk is mitigated or factored in (do not dismiss it outright). 
4: The explicit resolution of any data ambiguity or timeline progression. 
5: Final justification for the chosen verdict.]"""


def parse_verdict(output: str) -> dict:
    def extract(field, next_fields):
        next_pattern = "|".join([f"\\n{f}:" for f in next_fields]) if next_fields else "$"
        pattern = rf"{field}:\s*(.+?)(?={next_pattern})"
        match = re.search(pattern, output, re.DOTALL)
        return match.group(1).strip() if match else None

    verdict_match = re.search(r"VERDICT:\s*(INVEST|PARTNER|AVOID|WATCH)", output)
    confidence_match = re.search(r"CONFIDENCE:\s*(\d+)", output)

    conflicts_raw = extract("CROSS_AGENT_CONFLICTS", ["KEY_DECISION_DRIVERS"]) or "NONE"
    conflicts = None if conflicts_raw.upper() == "NONE" else conflicts_raw

    verdict = verdict_match.group(1) if verdict_match else "UNKNOWN"
    confidence = int(confidence_match.group(1)) if confidence_match else 5

    stability_match = re.search(r"STABILITY:\s*(HIGH|MEDIUM|LOW)", output, re.IGNORECASE)
    stability = stability_match.group(1).upper() if stability_match else None

    gap_pattern = r"INTELLIGENCE_GAP_\d+:\s*(.+?)\s*\|\s*CONFIDENCE_IMPACT:\s*\+?(\d+)"
    gaps_matches = re.findall(gap_pattern, output)
    intelligence_gaps = [{"description": desc.strip(), "impact": int(imp)} for desc, imp in gaps_matches]

    reasoning_raw = extract("REASONING", []) or output

    known_labels = [
        'VERDICT:', 'CONFIDENCE:', 'CROSS_AGENT_CONFLICTS:',
        'KEY_DECISION_DRIVERS:', 'STRONGEST_SUPPORTING_EVIDENCE:',
        'STRONGEST_OPPOSING_EVIDENCE:', 'TRADE_OFF:',
        'STABILITY:', 'STABILITY_REASON:', 'WHAT_WOULD_FLIP_TO_INVEST:',
        'WHAT_WOULD_FLIP_TO_AVOID:', 'INTELLIGENCE_GAP_1:', 
        'INTELLIGENCE_GAP_2:', 'INTELLIGENCE_GAP_3:', 'REASONING:'
    ]
    clean_lines = [
        line for line in reasoning_raw.split('\n')
        if not any(line.strip().startswith(label) for label in known_labels)
    ]
    reasoning_clean = '\n'.join(clean_lines).strip()

    return {
        "verdict": verdict,
        "confidence": confidence,
        "cross_agent_conflicts": conflicts,
        "key_decision_drivers": extract("KEY_DECISION_DRIVERS", ["STRONGEST_SUPPORTING_EVIDENCE"]) or "",
        "strongest_supporting_evidence": extract("STRONGEST_SUPPORTING_EVIDENCE", ["STRONGEST_OPPOSING_EVIDENCE"]) or "",
        "strongest_opposing_evidence": extract("STRONGEST_OPPOSING_EVIDENCE", ["TRADE_OFF"]) or "",
        "trade_off": extract("TRADE_OFF", ["STABILITY"]) or "",
        "stability": stability,
        "stability_reason": extract("STABILITY_REASON", ["WHAT_WOULD_FLIP_TO_INVEST"]) or "",
        "what_would_flip_to_invest": extract("WHAT_WOULD_FLIP_TO_INVEST", ["WHAT_WOULD_FLIP_TO_AVOID"]) or "",
        "what_would_flip_to_avoid": extract("WHAT_WOULD_FLIP_TO_AVOID", ["INTELLIGENCE_GAP_1", "REASONING"]) or "",
        "intelligence_gaps": intelligence_gaps,
        "reasoning": reasoning_clean,
    }


async def verdict_agent(company: str, agent_results: dict) -> dict:
    evidence_summary = build_evidence_summary(agent_results)

    prompt = VERDICT_PROMPT.format(
        company_name=company,
        evidence_summary=evidence_summary,
        news_output=agent_results.get("news", {}).get("output", "No data"),
        competitor_output=agent_results.get("competitor", {}).get("output", "No data"),
        business_model_output=agent_results.get("business_model", {}).get("output", "No data"),
        risk_output=agent_results.get("risk", {}).get("output", "No data"),
        opportunity_output=agent_results.get("opportunity", {}).get("output", "No data"),
    )
    output = await call_llm(prompt, temperature=0.1, max_tokens=8000)
    return parse_verdict(output)
