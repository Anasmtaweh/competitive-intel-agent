"""
News Agent — searches for recent business-critical events about a company
and synthesizes them into a bulleted summary with source citations.
"""

from core.llm import call_llm
from core.search import deduplicate_results, format_results_for_llm, get_latest_date, search, summarize_source_quality, calculate_evidence_quality, validate_citations
from core.agent_utils import parse_metadata, strip_metadata_block
from datetime import datetime

NEWS_PROMPT = """You are a financial analyst covering AI startups.

Company under analysis: {company_name}
Today's actual date is {current_date}. Use this as your reference point for what counts as current versus outdated.

Search results from the past 90 days:
{search_results}

INSTRUCTIONS:
1. Read every search result carefully.
2. Extract ONLY events that are business-critical: funding rounds, acquisitions, major partnerships, product launches that change market position, leadership changes, lawsuits, regulatory actions, or significant customer wins/losses.
3. Ignore: opinion pieces, minor software updates, repetitive coverage of the same event.
4. For each event, you MUST cite the Source URL from the search results.
5. If insufficient data found, say exactly: "Insufficient data found for this category."
6. If a source's Date is more than 6 months before today's date listed above, or describes an event that more recent sources contradict or supersede, do NOT present it as current fact. Either omit it or explicitly mark it as historical (e.g., 'as of a [date] announcement, this may since have changed').
7. Only cite a URL that is character-for-character identical to one of the URLs explicitly listed in the search results above. Do not generate, infer, paraphrase, or guess at any URL. If you cannot find a URL that exactly matches, do not make the claim.
8. The URL you cite for each claim must be the specific source that actually discusses THAT claim. Do not attach a URL from a different topic just because it appeared in your search results. For example, if a source is about a Microsoft partnership, do not cite it for a claim about an AWS partnership, even if both appear in your results. Re-read the source's title and content before citing it — the URL and the claim must match topically.
9. Do NOT write a bullet point that describes your own sourcing process, which tier your sources are, or which sources are 'most reliable.' That assessment belongs ONLY in the CONFIDENCE and INTERNAL_CONFLICTS fields at the end. Every bullet must be a substantive finding about the company, not a comment about your own methodology.
10. Use ONLY information from the search results provided. Do NOT use your training knowledge.
11. SUPERSEDED EVENTS: Before including any event, scan ALL your sources for later information about the same topic. If Source A reports that something happened (e.g., a departure, a policy, a deal) but Source B — dated later — shows a different current state (e.g., the person returned, the policy was reversed, the deal was restructured), then Source A's event has been superseded. Do NOT present superseded events as current news. Present only the most recent known state of affairs.
12. SOURCE QUALITY FOR QUANTITATIVE CLAIMS: Do NOT cite Tier 4 sources (Reddit, Facebook, YouTube, forums) for quantitative business claims such as revenue figures, loss figures, profit margins, valuations, market share percentages, or employee counts. Tier 4 sources may only support qualitative observations (e.g., sentiment, market perception). For any numerical business claim, you must use a Tier 1, Tier 2, or Tier 3 source. If the only source for a number is Tier 4, state the figure but explicitly caveat it as 'unverified (social media source)'.
13. TONE: Write like a journalist reporting facts, not an advocate. Use measured language. NEVER use absolute or hyperbolic language like "historic," "groundbreaking," "game-changing," or "unprecedented" unless directly quoting a source. Every statement must be proportional to the evidence.
14. CRITICAL RULE: You must synthesize information from at least two different sources. Do not extract all your claims from a single source.

OUTPUT FORMAT:
• [Event in one sentence] — Source: [URL]
• [Event in one sentence] — Source: [URL]
(Minimum 3 bullets. Maximum 6.)

After your bullet points, add this metadata block exactly:

CONFIDENCE: [1-10, how well these search results let you answer confidently. Penalize this score if sources are entirely low-tier or if there are unresolved genuine conflicts. HARD CEILING: If you have zero Tier 1 and zero Tier 2 sources, confidence MUST NOT exceed 6. If the majority of your sources are Tier 3 or lower, confidence MUST NOT exceed 7. Do not round up past these limits.]
MISSING_INFO: [What you could not find or confirm. Write NONE if nothing missing.]
INTERNAL_CONFLICTS: [If your sources disagree with each other on a CONTEMPORANEOUS fact, describe it. TIMELINE UPDATES: If sources report different numbers for the same metric but are from different dates (e.g. $24B in March vs $30B in April), this is a timeline progression, NOT an internal conflict. Present the most recent number as the current state, and write NONE here if there are no other genuine conflicts.]"""


async def news_agent(company: str) -> dict:
    """
    Run the News Agent for the given company.

    Searches across five query dimensions, deduplicates results,
    asks the LLM to synthesize business-critical events, and returns
    the output along with source URLs cited in the response.

    Returns:
        {"output": str, "sources": list[str]}
    """
    queries = [
        f"{company} news 2026",
        f"{company} funding investment raise 2026",
        f"{company} partnership deal announcement 2026",
        f"{company} CEO leadership change departure 2026",
        f"{company} lawsuit regulatory compliance 2026",
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
    prompt = NEWS_PROMPT.format(
        company_name=company,
        current_date=current_date_str,
        search_results=formatted,
    )
    raw_output = await call_llm(prompt, temperature=0.1, max_tokens=8000)

    display_output = strip_metadata_block(raw_output)
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
        **metadata,
    }
