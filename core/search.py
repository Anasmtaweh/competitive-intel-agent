"""
Search abstraction layer for the Competitive Intelligence Agent.

Provides a unified async search interface with three provider backends:
  - Serper (primary)
  - Brave Search (fallback 1)
  - Tavily (fallback 2)

All provider functions read API keys from environment variables.
To switch the active provider, change the single delegation line in search().
"""

import os
import re
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Anchor .env to the project root (one level above core/) so it loads
# regardless of the working directory the script is launched from.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env", override=False)

# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------


async def _serper_search(query: str, num_results: int = 5) -> list[dict]:
    """Search using the Serper API (Google Search wrapper)."""
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        raise ValueError("SERPER_API_KEY is not set in environment variables.")

    url = "https://google.serper.dev/search"
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }
    payload = {"q": query, "num": num_results}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(
                f"Serper API error {response.status_code}: {response.text}"
            )
        data = response.json()

    results = []
    for item in data.get("organic", [])[:num_results]:
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "date": item.get("date", None),
            }
        )
    return results


async def _brave_search(query: str, num_results: int = 5) -> list[dict]:
    """Search using the Brave Search API (fallback 1)."""
    api_key = os.getenv("BRAVE_API_KEY")
    if not api_key:
        raise ValueError("BRAVE_API_KEY is not set in environment variables.")

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }
    params = {"q": query, "count": num_results}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, params=params)
        if response.status_code != 200:
            raise RuntimeError(
                f"Brave API error {response.status_code}: {response.text}"
            )
        data = response.json()

    results = []
    for item in data.get("web", {}).get("results", [])[:num_results]:
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("description", ""),
            }
        )
    return results


async def _tavily_search(query: str, num_results: int = 5) -> list[dict]:
    """Search using the Tavily API (fallback 2)."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise ValueError("TAVILY_API_KEY is not set in environment variables.")

    url = "https://api.tavily.com/search"
    headers = {"Content-Type": "application/json"}
    payload = {
        "api_key": api_key,
        "query": query,
        "max_results": num_results,
        "search_depth": "basic",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(
                f"Tavily API error {response.status_code}: {response.text}"
            )
        data = response.json()

    results = []
    for item in data.get("results", [])[:num_results]:
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("content", ""),
            }
        )
    return results


# ---------------------------------------------------------------------------
# Trust tier classification
# ---------------------------------------------------------------------------

# Tier 1 domains — major financial/tech press and official news paths
_TIER_1_DOMAINS = [
    "reuters.com", "bloomberg.com", "wsj.com", "ft.com",
    "nytimes.com", "cnbc.com", "bbc.com", "apnews.com",
    "techcrunch.com", "wired.com", "theverge.com", "venturebeat.com",
    "forbes.com", "fortune.com", "businessinsider.com",
    "sec.gov", "crunchbase.com", "hbr.org",
]

# Tier 2 substrings — LinkedIn articles, blogs, Substack
_TIER_2_SUBSTRINGS = [
    "linkedin.com/pulse", "linkedin.com/company",
    "medium.com", "substack.com",
]

# Tier 3 substrings — remaining general web sources (default catch handled in get_trust_tier)
_TIER_3_SUBSTRINGS = [
]

# Tier 4 substrings — user-generated content platforms and personal social media
_TIER_4_SUBSTRINGS = [
    "reddit.com", "facebook.com", "youtube.com",
    "linkedin.com/posts", "linkedin.com/in",
    "twitter.com", "x.com",
]


def get_trust_tier(url: str) -> int:
    """
    Classify a URL into a trust tier (1–4).

    Tier 1: Major press, official /news/ paths.
    Tier 2: LinkedIn articles, Medium, Substack.
    Tier 3: Social posts, Twitter/X, personal pages.
    Tier 4: Reddit, Facebook, YouTube.
    Default: Tier 3.
    """
    url_lower = url.lower()

    # Tier 1: check named domains first, then /news/ path pattern
    for domain in _TIER_1_DOMAINS:
        if domain in url_lower:
            return 1
    if "/news/" in url_lower:
        return 1

    # Tier 2
    for substr in _TIER_2_SUBSTRINGS:
        if substr in url_lower:
            return 2

    # Tier 4 (check before Tier 3 so reddit/facebook/youtube aren't
    # caught by the Tier 3 x.com check)
    for substr in _TIER_4_SUBSTRINGS:
        if substr in url_lower:
            return 4

    # Tier 3
    for substr in _TIER_3_SUBSTRINGS:
        if substr in url_lower:
            return 3

    # Default
    return 3


def sort_by_trust(results: list[dict]) -> list[dict]:
    """
    Return a new list of results sorted by trust tier (ascending — Tier 1 first).
    Does not modify the original list.
    """
    return sorted(results, key=lambda r: get_trust_tier(r.get("url", "")))


def summarize_source_quality(results: list[dict]) -> dict:
    """
    Return a summary of how many sources fall into each trust tier.
    """
    counts = {"tier_1": 0, "tier_2": 0, "tier_3": 0, "tier_4": 0, "total": len(results)}
    for r in results:
        tier = get_trust_tier(r.get("url", ""))
        counts[f"tier_{tier}"] += 1
    return counts


def parse_date(date_str: str):
    """Attempt to parse a date string into a datetime object."""
    from datetime import datetime, timedelta
    if not date_str:
        return None

    # Handle relative dates like "3 days ago", "1 year ago", "6 hours ago"
    relative_match = re.match(
        r"(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago",
        date_str.strip(),
        re.IGNORECASE,
    )
    if relative_match:
        amount = int(relative_match.group(1))
        unit = relative_match.group(2).lower()
        now = datetime.now()
        deltas = {
            "second": timedelta(seconds=amount),
            "minute": timedelta(minutes=amount),
            "hour": timedelta(hours=amount),
            "day": timedelta(days=amount),
            "week": timedelta(weeks=amount),
            "month": timedelta(days=amount * 30),
            "year": timedelta(days=amount * 365),
        }
        return now - deltas.get(unit, timedelta(0))

    # Try common absolute date formats
    formats = [
        "%b %d, %Y",   # Jun 15, 2026
        "%B %d, %Y",   # June 15, 2026
        "%Y-%m-%d",    # 2026-06-15
        "%m/%d/%Y",    # 06/15/2026
        "%d %b %Y",    # 15 Jun 2026
        "%d %B %Y",    # 15 June 2026
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue

    return None


def calculate_evidence_quality(results: list[dict]) -> dict:
    """
    Computes evidence_quality (1-10) deterministically from source tiers and freshness.
    Returns a dict with 'score', 'receipt', and 'freshness_adjusted'.
    """
    from datetime import datetime
    
    receipt = {
        "tier_1": {"count": 0, "weight": 10},
        "tier_2": {"count": 0, "weight": 7},
        "tier_3": {"count": 0, "weight": 4},
        "tier_4": {"count": 0, "weight": 1},
        "count_bonus": 0,
        "freshness_multiplier": 1.0,
        "final_score": 1
    }
    
    if not results:
        return {"score": 1, "receipt": receipt, "freshness_adjusted": False}

    tier_weights = {1: 10, 2: 7, 3: 4, 4: 1}
    tiers = []
    decay_multipliers = []
    now = datetime.now()
    
    for r in results:
        tier = get_trust_tier(r.get("url", ""))
        tiers.append(tier)
        receipt[f"tier_{tier}"]["count"] += 1
        
        # Calculate freshness decay
        date_str = r.get("date")
        multiplier = 0.6 # default for unparseable or >180 days
        if date_str:
            try:
                parsed = parse_date(date_str)
                if parsed:
                    days_old = (now - parsed).days
                    if days_old <= 30:
                        multiplier = 1.0
                    elif days_old <= 90:
                        multiplier = 0.9
                    elif days_old <= 180:
                        multiplier = 0.75
            except Exception:
                pass # default to 0.6 on crash
        decay_multipliers.append(multiplier)
        
    avg_weight = sum(tier_weights.get(t, 4) for t in tiers) / len(tiers)
    
    # Bonus for having multiple sources (more corroboration)
    count_bonus = min(len(results) / 5, 1.0) * 1.5
    receipt["count_bonus"] = round(count_bonus, 2)
    
    base_score = avg_weight * 0.85 + count_bonus
    
    # Apply average freshness decay
    avg_decay = sum(decay_multipliers) / len(decay_multipliers) if decay_multipliers else 1.0
    receipt["freshness_multiplier"] = round(avg_decay, 2)
    
    final_score = base_score * avg_decay
    score_int = max(1, min(10, round(final_score)))
    receipt["final_score"] = score_int
    
    return {
        "score": score_int,
        "receipt": receipt,
        "freshness_adjusted": avg_decay < 1.0
    }

def get_latest_date(results: list[dict]) -> str | None:

    best_date_str = None
    best_parsed = None

    for r in results:
        raw = r.get("date")
        if not raw:
            continue
        parsed = parse_date(raw)
        if parsed is not None:
            if best_parsed is None or parsed > best_parsed:
                best_parsed = parsed
                best_date_str = raw

    # Fallback: if no dates could be parsed, return the first non-None raw string
    if best_date_str is None:
        for r in results:
            if r.get("date"):
                return r["date"]

    return best_date_str


# ---------------------------------------------------------------------------
# Main search entry point
# ---------------------------------------------------------------------------


async def search(query: str, num_results: int = 5) -> list[dict]:
    """
    Run a web search and return normalised results sorted by trust tier.

    Returns a list of dicts, each with keys: title, url, snippet.

    To switch providers, change the single function call below.
    """
    results = await _serper_search(query, num_results)
    return sort_by_trust(results)


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def format_results_for_llm(results: list[dict]) -> str:
    """
    Convert search results into a numbered text block suitable for LLM prompts.

    Format:
        [Source 1]
        Title: ...
        URL: ...
        Content: ...

        [Source 2]
        ...
    """
    if not results:
        return "No search results found."

    blocks = []
    for i, result in enumerate(results, start=1):
        tier = get_trust_tier(result.get("url", ""))
        date_line = f"Date: {result['date']}\n" if result.get("date") else ""
        block = (
            f"[Source {i} \u2014 Tier {tier}]\n"
            f"Title: {result.get('title', '')}\n"
            f"URL: {result.get('url', '')}\n"
            f"{date_line}"
            f"Content: {result.get('snippet', '')}"
        )
        blocks.append(block)

    return "\n\n".join(blocks)


def deduplicate_results(results: list[dict]) -> list[dict]:
    """
    Remove duplicate results based on URL, preserving original order.
    """
    seen_urls: set[str] = set()
    unique: list[dict] = []

    for result in results:
        url = result.get("url", "")
        if url not in seen_urls:
            seen_urls.add(url)
            unique.append(result)

    return unique


def extract_cited_urls(text: str) -> list[str]:
    """Extracts all strings that appear after 'Source:' in the agent output."""
    # Matches "Source: https://..." OR "Source: [blog.google](...)" OR "Source: blog.google"
    # We capture any non-whitespace string immediately following "Source: " or "Source: ["
    pattern = r"Source:\s*\[?([^\s,\])]+)"
    return re.findall(pattern, text)


def validate_citations(text: str, unique_results: list[dict]) -> dict:
    """
    Checks each cited string against the real search result URLs.
    Includes fallback substring matching for abbreviated domains, prioritizing the longest match.
    """
    real_urls = {r["url"] for r in unique_results}
    cited_strings = extract_cited_urls(text)
    
    verified = []
    unverified_count = 0
    
    for cited in cited_strings:
        cited_lower = cited.lower()
        # 1. Exact match
        if cited in real_urls:
            verified.append(cited)
            continue
            
        # 2. Substring match fallback (prioritize longest matching real URL)
        matched_real = None
        longest_match_len = -1
        
        for real_url in real_urls:
            if cited_lower in real_url.lower():
                # Pick the longest matching URL (most specific match)
                if len(real_url) > longest_match_len:
                    longest_match_len = len(real_url)
                    matched_real = real_url
                    
        if matched_real:
            verified.append(matched_real)
        else:
            unverified_count += 1
            
    return {
        "verified_sources": list(dict.fromkeys(verified)),  # dedupe, preserve order
        "unverified_count": unverified_count,
    }



