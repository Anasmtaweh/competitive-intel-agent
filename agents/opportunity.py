"""
Opportunity Agent — identifies positive growth signals, new partnerships,
market tailwinds, and product launches.
"""

import re

from core.llm import call_llm
from core.search import deduplicate_results, format_results_for_llm, get_latest_date, search, summarize_source_quality, calculate_evidence_quality, validate_citations
from core.agent_utils import parse_metadata, strip_metadata_block
from datetime import datetime

OPPORTUNITY_PROMPT = """You are a growth analyst specializing in AI startups.

Company under analysis: {company_name}
Today's actual date is {current_date}. Use this as your reference point for what counts as current versus outdated.

Search results:
{search_results}

INSTRUCTIONS:
1. Identify the top 3 growth opportunities or positive signals for {company_name}.
2. For each opportunity, assign:
   - IMPACT: 1-10 (how beneficial would this be if it materialized fully)
   - LIKELIHOOD: 1-10 (how probable is this opportunity based on current evidence)
3. ONE sentence per opportunity explaining why it matters to an investor.
4. PROPER NOUNS: Do not hallucinate or guess names. You must spell the names of individuals, products, and companies EXACTLY as they appear in the search results.
5. Cite source URLs.
6. Only include opportunities supported by evidence from the search results.
6. Look for: new partnerships, market expansion, product launches, customer growth, favorable regulatory conditions, talent acquisition.
7. If a source's Date is more than 6 months before today's date listed above, or describes an event that more recent sources contradict or supersede, do NOT present it as current fact. Either omit it or explicitly mark it as historical (e.g., 'as of a [date] announcement, this may since have changed').
8. Only cite a URL that is character-for-character identical to one of the URLs explicitly listed in the search results above. Do not generate, infer, paraphrase, or guess at any URL. If you cannot find a URL that exactly matches, do not make the claim.
9. The URL you cite for each claim must be the specific source that actually discusses THAT claim. Do not attach a URL from a different topic just because it appeared in your search results. For example, if a source is about a Microsoft partnership, do not cite it for a claim about an AWS partnership, even if both appear in your results. Re-read the source's title and content before citing it — the URL and the claim must match topically.
10. Do NOT write a bullet point that describes your own sourcing process, which tier your sources are, or which sources are 'most reliable.' That assessment belongs ONLY in the CONFIDENCE and INTERNAL_CONFLICTS fields at the end. Every bullet must be a substantive finding about the company, not a comment about your own methodology.
11. Do NOT use your training knowledge.
12. FINANCIAL RECONCILIATION: When analyzing financial metrics (revenue, losses, margins, valuations, burn rate, unit economics), you must perform basic accounting logic to ensure numbers align. If different sources present varying figures, compute whether they are mathematically consistent (e.g., if operating margin is -122% on $5.7B quarterly revenue, compute the implied annual loss and compare it against any separately reported loss figure). If figures are mathematically incompatible, explicitly state the discrepancy with the computed math, do not present them as a unified fact, and prioritize the most recent or highest-tier source.
13. SUPERSEDED EVENTS: Before including any claim, scan ALL your sources for later information about the same topic. If Source A reports that something happened (e.g., a departure, a policy, a deal) but Source B — dated later — shows a different current state (e.g., the person returned, the policy was reversed, the deal was restructured), then Source A's claim has been superseded. Do NOT present superseded claims as current fact. Present only the most recent known state of affairs.
14. SOURCE QUALITY FOR QUANTITATIVE CLAIMS: Do NOT cite Tier 4 sources (Reddit, Facebook, YouTube, forums) for quantitative business claims such as revenue figures, loss figures, profit margins, valuations, market share percentages, or employee counts. Tier 4 sources may only support qualitative observations (e.g., sentiment, market perception). For any numerical business claim, you must use a Tier 1, Tier 2, or Tier 3 source. If the only source for a number is Tier 4, state the figure but explicitly caveat it as 'unverified (social media source)'.
15. TONE: Write like an analyst, not a promoter. Use measured language (e.g., "appears to," "suggests," "substantially improves," "provides significant runway"). NEVER use absolute or hyperbolic language like "guarantees," "ensures," "dominates," "insurmountable," or "massive." Every claim must be defensible if challenged. Clearly distinguish between what has already happened (facts) and what is projected or targeted (estimates).
16. CRITICAL RULE: You must synthesize information from at least two different sources. Do not extract all your claims from a single source.
17. NO REASONING: DO NOT output any step-by-step reasoning, scratchpad, or inner monologue. Start your response IMMEDIATELY with the requested OUTPUT FORMAT.

OUTPUT FORMAT:
OPPORTUNITY_1|{company_name}|IMPACT:[1-10]|LIKELIHOOD:[1-10]|[Opportunity name]
[Description] — Source: [URL]

OPPORTUNITY_2|{company_name}|IMPACT:[1-10]|LIKELIHOOD:[1-10]|[Opportunity name]
[Description] — Source: [URL]

OPPORTUNITY_3|{company_name}|IMPACT:[1-10]|LIKELIHOOD:[1-10]|[Opportunity name]
[Description] — Source: [URL]

After the 3 opportunities, add this metadata block exactly:

CONFIDENCE: [1-10, how well these search results let you assess opportunity confidently. Penalize this score if sources are entirely low-tier or if there are unresolved genuine conflicts. HARD CEILING: If you have zero Tier 1 and zero Tier 2 sources, confidence MUST NOT exceed 6. If the majority of your sources are Tier 3 or lower, confidence MUST NOT exceed 7. Do not round up past these limits.]
MISSING_INFO: [What you could not find or confirm. Write NONE if nothing missing.]
INTERNAL_CONFLICTS: [If your sources disagree with each other on a CONTEMPORANEOUS fact, describe it. TIMELINE UPDATES: If sources report different numbers for the same metric but are from different dates (e.g. $24B in March vs $30B in April), this is a timeline progression, NOT an internal conflict. Present the most recent number as the current state, and write NONE here if there are no other genuine conflicts.]"""


def score_to_label(score: int) -> str:
    if score >= 56:
        return "HIGH"
    elif score >= 25:
        return "MEDIUM"
    else:
        return "LOW"


def parse_opportunities(output: str) -> list[dict]:
    opportunities = []
    pattern = r"OPPORTUNITY_\d+\|[^|]+\|IMPACT:(\d+)\|LIKELIHOOD:(\d+)\|(.+)\n(.+)"
    matches = re.findall(pattern, output)
    for impact_str, likelihood_str, name, description in matches:
        impact = int(impact_str)
        likelihood = int(likelihood_str)
        opportunity_score = impact * likelihood
        opportunities.append({
            "name": name.strip(),
            "impact": impact,
            "likelihood": likelihood,
            "opportunity_score": opportunity_score,
            "strength": score_to_label(opportunity_score),
            "description": description.strip(),
        })
    return opportunities


async def opportunity_agent(company: str) -> dict:
    queries = [
        f"{company} artificial intelligence AI growth expansion new market 2026",
        f"{company} artificial intelligence AI partnership integration deal 2026",
        f"{company} artificial intelligence AI new product launch feature announcement",
        f"{company} artificial intelligence AI award recognition momentum positive 2026",
    ]

    all_results = []
    for query in queries:
        results = await search(query, num_results=3)
        all_results.extend(results)

    unique_results = deduplicate_results(all_results)
    latest_date = get_latest_date(unique_results)
    source_quality = summarize_source_quality(unique_results)
    formatted = format_results_for_llm(unique_results)

    current_date_str = datetime.now().strftime("%B %d, %Y")
    prompt = OPPORTUNITY_PROMPT.format(
        company_name=company, 
        current_date=current_date_str,
        search_results=formatted
    )
    raw_output = await call_llm(prompt, temperature=0.1, max_tokens=8000)

    opportunities = parse_opportunities(raw_output)
    display_output = re.sub(r"OPPORTUNITY_\d+\|[^\n]+\n?", "", raw_output)
    display_output = re.split(r"\nCONFIDENCE:", display_output)[0].strip()
    
    metadata = parse_metadata(raw_output)
    evidence_data = calculate_evidence_quality(unique_results)

    # Extract and validate source URLs
    citation_check = validate_citations(raw_output, unique_results)
    sources = citation_check["verified_sources"]
    unverified_citation_count = citation_check["unverified_count"]

    # Check for hallucinated sources instead of hallucinated proper nouns
    if unverified_citation_count > 0:
        warning_msg = f"WARNING: {unverified_citation_count} cited sources were not found in the search results. Claims may be hallucinated."
        if not metadata.get("internal_conflicts") or metadata["internal_conflicts"].upper() == "NONE":
            metadata["internal_conflicts"] = warning_msg
        else:
            metadata["internal_conflicts"] += f" | {warning_msg}"

    return {
        "output": display_output,
        "sources": sources,
        "latest_date": latest_date,
        "source_quality": source_quality,
        "evidence_quality": evidence_data["score"],
        "evidence_receipt": evidence_data["receipt"],
        "freshness_adjusted": evidence_data["freshness_adjusted"],
        "unverified_citation_count": unverified_citation_count,
        "opportunities": opportunities,
        **metadata,
    }
