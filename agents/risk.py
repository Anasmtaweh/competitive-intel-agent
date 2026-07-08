"""
Risk Agent — identifies the top risks facing a company and parses them
into a structured format along with a text summary.
"""

import re

from core.llm import call_llm
from core.search import deduplicate_results, format_results_for_llm, get_latest_date, search, summarize_source_quality, calculate_evidence_quality, validate_citations
from core.agent_utils import parse_metadata, strip_metadata_block
from datetime import datetime

RISK_PROMPT = """You are a risk analyst specializing in AI startups.

Company under analysis: {company_name}
Today's actual date is {current_date}. Use this as your reference point for what counts as current versus outdated.

Search results:
{search_results}

INSTRUCTIONS:
1. Identify exactly 3 risks facing {company_name} based on the search results. When selecting which 3 risks to present, prefer risks supported by Tier 1-3 sources over those supported only by Tier 4 sources. A risk backed only by Tier 4 evidence should only appear in the top 3 if fewer than 3 risks have higher-tier evidence.
2. For each risk, assign:
   - IMPACT: 1-10 (how severe would this be if it materialized fully)
   - LIKELIHOOD: 1-10 (how probable is this risk based on current evidence)
3. ONE sentence per risk explaining why it matters.
4. Cite source URLs.
5. Only include risks supported by evidence in the search results.
6. If a source's Date is more than 6 months before today's date listed above, or describes an event that more recent sources contradict or supersede, do NOT present it as current fact. Either omit it or explicitly mark it as historical (e.g., 'as of a [date] announcement, this may since have changed').
7. Only cite a URL that is character-for-character identical to one of the URLs explicitly listed in the search results above. Do not generate, infer, paraphrase, or guess at any URL. If you cannot find a URL that exactly matches, do not make the claim.
8. The URL you cite for each claim must be the specific source that actually discusses THAT claim. Do not attach a URL from a different topic just because it appeared in your search results. For example, if a source is about a Microsoft partnership, do not cite it for a claim about an AWS partnership, even if both appear in your results. Re-read the source's title and content before citing it — the URL and the claim must match topically.
9. Do NOT write a bullet point that describes your own sourcing process, which tier your sources are, or which sources are 'most reliable.' That assessment belongs ONLY in the CONFIDENCE and INTERNAL_CONFLICTS fields at the end. Every bullet must be a substantive finding about the company, not a comment about your own methodology.
10. Do NOT use your training knowledge.
11. FINANCIAL RECONCILIATION: When analyzing financial metrics (revenue, losses, margins, valuations, burn rate, unit economics), you must perform basic accounting logic to ensure numbers align. If different sources present varying figures, compute whether they are mathematically consistent (e.g., if operating margin is -122% on $5.7B quarterly revenue, compute the implied annual loss and compare it against any separately reported loss figure). If figures are mathematically incompatible, explicitly state the discrepancy with the computed math, do not present them as a unified fact, and prioritize the most recent or highest-tier source.
12. SUPERSEDED EVENTS: Before including any claim, scan ALL your sources for later information about the same topic. If Source A reports that something happened (e.g., a departure, a policy, a deal) but Source B — dated later — shows a different current state (e.g., the person returned, the policy was reversed, the deal was restructured), then Source A's claim has been superseded. Do NOT present superseded claims as current fact. Present only the most recent known state of affairs.
13. SOURCE QUALITY FOR QUANTITATIVE CLAIMS: Do NOT cite Tier 4 sources (Reddit, Facebook, YouTube, forums) for quantitative business claims such as revenue figures, loss figures, profit margins, valuations, market share percentages, or employee counts. Tier 4 sources may only support qualitative observations (e.g., sentiment, market perception). For any numerical business claim, you must use a Tier 1, Tier 2, or Tier 3 source. If the only source for a number is Tier 4, state the figure but explicitly caveat it as 'unverified (social media source)'.
14. TONE: Write like an analyst, not a sensationalist. Use measured language (e.g., "faces significant exposure to," "current evidence suggests," "introduces material uncertainty"). NEVER use absolute or hyperbolic language like "existential," "catastrophic," "guaranteed failure," or "doomed." Every risk description must be proportional to the evidence and defensible if challenged. Clearly distinguish between what has already happened (facts) and what is projected or feared (estimates).
15. CRITICAL RULE: You must synthesize information from at least two different sources. Do not extract all your claims from a single source.

OUTPUT FORMAT:
RISK_1|{company_name}|IMPACT:[1-10]|LIKELIHOOD:[1-10]|[Risk name]
[Description] — Source: [URL]

RISK_2|{company_name}|IMPACT:[1-10]|LIKELIHOOD:[1-10]|[Risk name]
[Description] — Source: [URL]

RISK_3|{company_name}|IMPACT:[1-10]|LIKELIHOOD:[1-10]|[Risk name]
[Description] — Source: [URL]

After the 3 risks, add this metadata block exactly:

CONFIDENCE: [1-10, how well these search results let you assess risk confidently. Penalize this score if sources are entirely low-tier or if there are unresolved genuine conflicts. HARD CEILING: If you have zero Tier 1 and zero Tier 2 sources, confidence MUST NOT exceed 6. If the majority of your sources are Tier 3 or lower, confidence MUST NOT exceed 7. Do not round up past these limits.]
MISSING_INFO: [What you could not find or confirm. Write NONE if nothing missing.]
INTERNAL_CONFLICTS: [If your sources disagree with each other on a CONTEMPORANEOUS fact, describe it. TIMELINE UPDATES: If sources report different numbers for the same metric but are from different dates (e.g. $24B in March vs $30B in April), this is a timeline progression, NOT an internal conflict. Present the most recent number as the current state, and write NONE here if there are no other genuine conflicts.]"""


def score_to_label(score: int) -> str:
    if score >= 56:
        return "HIGH"
    elif score >= 25:
        return "MEDIUM"
    else:
        return "LOW"


def parse_risks(output: str) -> list[dict]:
    risks = []
    pattern = r"RISK_\d+\|[^|]+\|IMPACT:(\d+)\|LIKELIHOOD:(\d+)\|(.+)\n(.+)"
    matches = re.findall(pattern, output)
    for impact_str, likelihood_str, name, description in matches:
        impact = int(impact_str)
        likelihood = int(likelihood_str)
        risk_score = impact * likelihood
        risks.append({
            "name": name.strip(),
            "impact": impact,
            "likelihood": likelihood,
            "risk_score": risk_score,
            "severity": score_to_label(risk_score),
            "description": description.strip(),
        })
    return risks


async def risk_agent(company: str) -> dict:
    queries = [
        f"{company} risks challenges problems 2026",
        f"{company} lawsuit legal regulatory fine 2026",
        f"{company} CEO leadership departure fired controversy",
        f"{company} layoffs restructuring financial trouble",
        f"{company} competition threat market share loss",
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
    prompt = RISK_PROMPT.format(
        company_name=company, 
        current_date=current_date_str,
        search_results=formatted
    )
    raw_output = await call_llm(prompt, temperature=0.1, max_tokens=8000)

    risks = parse_risks(raw_output)
    display_output = re.sub(r"RISK_\d+\|[^\n]+\n?", "", raw_output)
    display_output = re.split(r"\nCONFIDENCE:", display_output)[0].strip()
    
    metadata = parse_metadata(raw_output)
    evidence_data = calculate_evidence_quality(unique_results)

    # Extract and validate source URLs
    citation_check = validate_citations(raw_output, unique_results)
    sources = citation_check["verified_sources"]
    unverified_citation_count = citation_check["unverified_count"]

    return {
        "output": display_output,
        "sources": sources,
        "latest_date": latest_date,
        "source_quality": source_quality,
        "evidence_quality": evidence_data["score"],
        "evidence_receipt": evidence_data["receipt"],
        "freshness_adjusted": evidence_data["freshness_adjusted"],
        "unverified_citation_count": unverified_citation_count,
        "risks": risks,
        **metadata,
    }
