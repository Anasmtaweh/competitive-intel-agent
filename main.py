"""
FastAPI backend for the Competitive Intelligence Agent.

Exposes a streaming SSE endpoint to deliver live intelligence results to the frontend.
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from core.orchestrator import run_analysis
from core.chat import run_chat_stream
from core.llm import api_key_context
from pydantic import BaseModel

app = FastAPI(title="Competitive Intelligence Agent")

# Allow all origins for CORS so the React dev server (port 3000) can access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/stream")
async def stream_analysis(company: str = Query(..., min_length=1), api_key: str = Query(None)):
    """
    Stream competitive intelligence analysis results via Server-Sent Events (SSE).
    """
    if api_key:
        api_key_context.set(api_key)
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        # Prevent Nginx or other reverse proxies from buffering SSE events
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        run_analysis(company),
        media_type="text/event-stream",
        headers=headers,
    )


class ChatRequest(BaseModel):
    company: str
    query: str
    report_context: str
    history: list[dict] = []
    api_key: str = None

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Stream context-aware chat response for a specific company analysis.
    """
    if request.api_key:
        api_key_context.set(request.api_key)
        
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        run_chat_stream(request.company, request.query, request.report_context, request.history),
        media_type="text/event-stream",
        headers=headers,
    )

# After React is built, this serves the frontend
# app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
