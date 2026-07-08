"""
Provider-agnostic LLM client for the Competitive Intelligence Agent.

Sends OpenAI-compatible chat completion requests. The target provider is
controlled entirely by environment variables:
  - LLM_BASE_URL  (e.g. https://api.groq.com/openai/v1)
  - LLM_API_KEY
  - LLM_MODEL     (e.g. llama-3.3-70b-versatile)

To switch from dev (Groq) to prod (Fireworks AI), update .env — no code changes.
"""

import os
import asyncio
from pathlib import Path

import httpx
from dotenv import load_dotenv
import contextvars

api_key_context = contextvars.ContextVar("api_key", default=None)

# Anchor .env to the project root (one level above core/) so it loads
# regardless of the working directory the script is launched from.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env", override=True)


async def call_llm(
    prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 8000,
) -> str:
    """
    Call the configured LLM with a single user prompt.

    Returns the model's response text, stripped of leading/trailing whitespace.
    Raises on HTTP errors or missing configuration.
    """
    base_url = os.getenv("LLM_BASE_URL")
    api_key = api_key_context.get() or os.getenv("LLM_API_KEY")
    model = os.getenv("LLM_MODEL")

    if not base_url:
        raise ValueError("LLM_BASE_URL is not set in environment variables.")
    if not api_key:
        raise ValueError("LLM_API_KEY is not set in environment variables or request context.")
    if not model:
        raise ValueError("LLM_MODEL is not set in environment variables.")

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    max_retries = 4
    base_delay = 2.0

    async with httpx.AsyncClient(timeout=120.0) as client:
        for attempt in range(max_retries):
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()

                import re
                # DeepSeek reasoner puts thinking between <think>...</think> tags
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                # Also strip "Thinking Process:" header pattern if present
                content = re.sub(r'^Thinking Process:.*?(?=\n[ \t]*[•\-\*]|\nREVENUE|\nOutput:|\nCONFIDENCE:)', '', content, flags=re.DOTALL).strip()

                return content
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < max_retries - 1:
                    # Exponential backoff: 2s, 4s, 8s...
                    delay = base_delay * (2 ** attempt)
                    print(f"API Rate Limit hit (429). Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                # If we exhausted retries or it's a different error, re-raise
                raise


async def stream_llm(
    prompt: str = None,
    temperature: float = 0.5,
    max_tokens: int = 8000,
    messages: list = None,
):
    """
    Call the configured LLM with a single user prompt and yield chunks as they stream.
    """
    base_url = os.getenv("LLM_BASE_URL")
    api_key = api_key_context.get() or os.getenv("LLM_API_KEY")
    model = os.getenv("LLM_MODEL")

    if not base_url or not api_key or not model:
        raise ValueError("Missing LLM env vars (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL) and no API key in context.")

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if messages:
        payload_messages = messages
    elif prompt:
        payload_messages = [{"role": "user", "content": prompt}]
    else:
        raise ValueError("Must provide either prompt or messages")

    payload = {
        "model": model,
        "messages": payload_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    import json
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        if "choices" in chunk and len(chunk["choices"]) > 0:
                            delta = chunk["choices"][0].get("delta", {})
                            content = delta.get("content")
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue
