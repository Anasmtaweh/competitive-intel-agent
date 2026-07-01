"""
Competitor Agent — identifies top competitors and evaluates the company's
competitive position based on recent search results.
"""

from core.llm import call_llm
from core.search import deduplicate_results, format_results_for_llm, get_latest_date, search, summarize_source_quality, calculate_evidence_quality, validate_citations
from core.agent_utils import parse_metadata, strip_metadata_block
from datetime import datetime

COMPETITOR_PROMPT = """You are a competitive intelligence analyst specializing in AI companies.

Company under analysis: {company_name}
Today's actual date is {current_date}. Use this as your reference point for what counts as current versus outdated.

Search results:
{search_results}

INSTRUCTIONS:
1. Identify exactly the top 3 competitors to {company_name} based on the search results.
2. For each competitor: ONE sentence on their main strength relative to {company_name}.
3. ONE sentence on {company_name}'s competitive position overall.
4. Cite source URLs for all factual claims.
5. Only include competitors mentioned in the search results.
6. When multiple sources give conflicting figures for the same metric, use the most recently dated source and note the date.
7. Sources labeled [Tier 1] are most reliable. Prefer them over lower-tier sources when information conflicts.
8. If a source's Date is more than 6 months before today's date listed above, or describes an event that more recent sources contradict or supersede, do NOT present it as current fact. Either omit it or explicitly mark it as historical (e.g., 'as of a [date] announcement, this may since have changed').
9. Only cite a URL that is character-for-character identical to one of the URLs explicitly listed in the search results above. Do not generate, infer, paraphrase, or guess at any URL. If you cannot find a URL that exactly matches, do not make the claim.
10. The URL you cite for each claim must be the specific source that actually discusses THAT claim. Do not attach a URL from a different topic just because it appeared in your search results. For example, if a source is about a Microsoft partnership, do not cite it for a claim about an AWS partnership, even if both appear in your results. Re-read the source's title and content before citing it — the URL and the claim must match topically.
11. Do NOT write a bullet point that describes your own sourcing process, which tier your sources are, or which sources are 'most reliable.' That assessment belongs ONLY in the CONFIDENCE and INTERNAL_CONFLICTS fields at the end. Every bullet must be a substantive finding about the company, not a comment about your own methodology.
12. Do NOT use your training knowledge. Use ONLY the search results provided.
13. SUPERSEDED EVENTS: Before including any claim, scan ALL your sources for later information about the same topic. If Source A reports that something happened (e.g., a departure, a policy, a deal) but Source B — dated later — shows a different current state (e.g., the person returned, the policy was reversed, the deal was restructured), then Source A's claim has been superseded. Do NOT present superseded claims as current fact. Present only the most recent known state of affairs.
14. SOURCE QUALITY FOR QUANTITATIVE CLAIMS: Do NOT cite Tier 4 sources (Reddit, Facebook, YouTube, forums) for quantitative business claims such as revenue figures, loss figures, profit margins, valuations, market share percentages, or employee counts. Tier 4 sources may only support qualitative observations (e.g., sentiment, market perception). For any numerical business claim, you must use a Tier 1, Tier 2, or Tier 3 source. If the only source for a number is Tier 4, state the figure but explicitly caveat it as 'unverified (social media source)'.
15. TONE: Write like an analyst, not a promoter. Use measured language (e.g., "appears to maintain," "currently holds," "suggests a competitive advantage"). NEVER use absolute or hyperbolic language like "dominates," "crushes," "unbeatable," or "insurmountable." Every claim must be proportional to the evidence and defensible if challenged.

OUTPUT FORMAT:
• [Insight in one sentence] — Source: [URL]
• [Insight in one sentence] — Source: [URL]
(Minimum 3 bullets. Maximum 6.)

After your bullet points, add this metadata block exactly:

CONFIDENCE: [1-10, how well these search results let you answer confidently. Penalize this score if sources are entirely low-tier or if there are unresolved genuine conflicts. HARD CEILING: If you have zero Tier 1 and zero Tier 2 sources, confidence MUST NOT exceed 6. If the majority of your sources are Tier 3 or lower, confidence MUST NOT exceed 7. Do not round up past these limits.]
MISSING_INFO: [What you could not find or confirm. Write NONE if nothing missing.]
INTERNAL_CONFLICTS: [If your sources disagree with each other on a CONTEMPORANEOUS fact, describe it. TIMELINE UPDATES: If sources report different numbers for the same metric but are from different dates (e.g. $24B in March vs $30B in April), this is a timeline progression, NOT an internal conflict. Present the most recent number as the current state, and write NONE here if there are no other genuine conflicts. PROJECTIONS VS FACTS: Do not treat projections or future targets as established facts; clearly distinguish between verified historical results and future estimates.]"""


async def competitor_agent(company: str) -> dict:
    """
    Run the Competitor Agent for the given company.

    Searches across four query dimensions to identify competitors and market
    position, deduplicates results, asks the LLM to synthesize the landscape,
    and returns the output along with source URLs cited.

    Returns:
        {"output": str, "sources": list[str]}
    """
    queries = [
        f"top AI model companies competing with {company} 2026",
        f"{company} vs OpenAI Google Meta Mistral market share enterprise",
        f"{company} enterprise AI market position competitor analysis 2026",
        f"{company} AI competitors funding valuation comparison 2026",
    ]

    # Run all searches sequentially
    all_results = []
    for query in queries:
        results = await search(query, num_results=3)
        all_results.extend(results)

    # Deduplicate and format
    unique_results = deduplicate_results(all_results)
    latest_date = get_latest_date(unique_results)
    source_quality = summarize_source_quality(unique_results)
    formatted = format_results_for_llm(unique_results)

    # Build prompt and call LLM
    current_date_str = datetime.now().strftime("%B %d, %Y")
    prompt = COMPETITOR_PROMPT.format(
        company_name=company,
        current_date=current_date_str,
        search_results=formatted,
    )
    raw_output = await call_llm(prompt, temperature=0.1, max_tokens=8000)

    display_output = strip_metadata_block(raw_output)
    metadata = parse_metadata(raw_output)
    evidence_quality = calculate_evidence_quality(unique_results)

    # Extract and validate source URLs
    citation_check = validate_citations(raw_output, unique_results)
    sources = citation_check["verified_sources"]
    unverified_citation_count = citation_check["unverified_count"]

    return {
        "output": display_output,
        "sources": sources,
        "latest_date": latest_date,
        "source_quality": source_quality,
        "evidence_quality": evidence_quality,
        "unverified_citation_count": unverified_citation_count,
        **metadata,
    }
