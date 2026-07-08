# 🔍 Competitive Intelligence Agent

> **AI-powered multi-agent system that delivers institutional-grade competitive analysis in under 60 seconds.**

An autonomous swarm of 6 specialized AI agents performs real-time competitive intelligence — analyzing breaking news, competitive positioning, business model sustainability, risk vectors, and growth signals — then synthesizes everything into a single executive recommendation with full evidence traceability.

Built for founders, investors, and analysts who need Bloomberg Terminal-depth insights without the Bloomberg Terminal price tag.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![Fireworks AI](https://img.shields.io/badge/Fireworks_AI-AMD_Hardware-FF6B35)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 What It Does

Type any company name. In under 60 seconds, receive:

| Agent | Role | Output |
|-------|------|--------|
| 📰 **News Agent** | Scans for funding rounds, acquisitions, lawsuits, leadership changes | Sourced breaking news with recency timestamps |
| ⚔️ **Competitor Agent** | Maps competitive landscape and market positioning | Competitive moat analysis with market share data |
| 💰 **Business Model Agent** | Evaluates revenue streams, pricing, and unit economics | Sustainability assessment with financial metrics |
| 🚨 **Risk Agent** | Identifies downside vectors with structured scoring | Risks scored by Impact × Likelihood (0-100) |
| 🚀 **Opportunity Agent** | Surfaces growth catalysts with structured scoring | Opportunities scored by Impact × Likelihood (0-100) |
| ⚖️ **Verdict Agent** | Cross-references all 5 agents and issues final recommendation | **INVEST / PARTNER / WATCH / AVOID** with confidence score |

Every data point is traced back to its source URL and classified into a **4-tier trust system** (Tier 1: Reuters, Bloomberg → Tier 4: Reddit, Twitter).

---

## 🏗️ Architecture

```
User → Next.js Frontend → FastAPI Backend (/api/stream SSE)
                               ↓
                         Orchestrator (asyncio)
                    ┌──────────┼──────────┐
                    ↓          ↓          ↓        (5 agents run concurrently)
               News Agent  Competitor  Business Model  Risk  Opportunity
               (Search→LLM) (Search→LLM) (Search→LLM)  ...    ...
                    │          │          │
                    └──────────┼──────────┘
                               ↓
                    Verdict Agent (LLM synthesis only)
                               ↓
                    SSE stream back to frontend
```

### Key Design Decisions

- **No agent framework.** Zero dependency on LangChain, CrewAI, or any SDK. Every agent is hand-built Python for full control over prompting, parsing, and error handling.
- **Provider-agnostic LLM layer.** Swap any OpenAI-compatible API (Fireworks AI, Groq, OpenAI, local vLLM) by changing 3 environment variables. Zero code changes.
- **Concurrent execution.** All 5 research agents fire simultaneously via `asyncio`, cutting wall-clock time by ~5×.
- **SSE streaming.** Results appear in real-time as each agent completes — no waiting for the slowest agent.
- **Evidence quality pipeline.** Deterministic scoring from source trust tiers, citation validation against actual search results, and confidence ceilings (max 7/10 without Tier 1 sources).

---

## 🖥️ Frontend — Executive Dashboard

The frontend is a dark-mode, glassmorphism-styled executive dashboard built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **shadcn/ui**.

**Key UI Components:**
- **Recommendation Hero** — Verdict badge with animated confidence ring (SVG)
- **Data Quality Donut** — Recharts pie chart showing Tier 1-4 source distribution
- **Risk & Growth Signal Bars** — Impact/Likelihood/Score breakdowns per vector
- **Agent Report Cards** — Live streaming output with metadata badges, loading skeletons, collapsible source lists, and `(historical)` / `⚠ Unverified Citation` badges

---

## ⚡ AMD Platform Usage

This project runs inference through **Fireworks AI**, which hosts models on **AMD Instinct GPUs**. The active model configuration uses AMD-accelerated infrastructure for all LLM calls:

- **LLM Provider:** Fireworks AI (AMD hardware)
- **Active Model:** `qwen3p7-plus` hosted on AMD GPUs via Fireworks
- **All 6 agents** route through the same AMD-accelerated endpoint
- **Tested models** include `deepseek-v4-pro`, `kimi-k2p6`, `glm-5p2`, and `gpt-oss-120b` — all on Fireworks/AMD

The architecture is designed to be provider-agnostic: switching between AMD-hosted Fireworks models requires only changing 3 environment variables, making it trivial to benchmark different models on AMD infrastructure.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- API keys for Fireworks AI and a search provider (Serper, Brave, or Tavily)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/competitive-intelligence-agent.git
cd competitive-intelligence-agent
```

### 2. Set up the backend

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# LLM Configuration (any OpenAI-compatible API)
LLM_BASE_URL=https://api.fireworks.ai/inference/v1
LLM_API_KEY=your_fireworks_api_key
LLM_MODEL=accounts/fireworks/models/qwen3p7-plus

# Search Provider (at least one required)
SERPER_API_KEY=your_serper_key
BRAVE_API_KEY=your_brave_key        # Optional fallback
TAVILY_API_KEY=your_tavily_key      # Optional fallback
```

### 4. Set up the frontend

```bash
cd frontend
npm install
```

### 5. Run the application

**Terminal 1 — Backend:**
```bash
uvicorn main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** and start analyzing.

---

## 🐳 Docker

### Using Docker Compose (recommended)

```bash
docker-compose up --build
```

The app will be available at **http://localhost:3000**.

### Using individual Dockerfiles

```bash
# Build and run backend
docker build -t cia-backend -f Dockerfile.backend .
docker run -p 8000:8000 --env-file .env cia-backend

# Build and run frontend
docker build -t cia-frontend -f Dockerfile.frontend ./frontend
docker run -p 3000:3000 cia-frontend
```

---

## 📁 Project Structure

```
competitive-intel/
├── main.py                     # FastAPI entry point
├── requirements.txt            # Python dependencies
├── Dockerfile.backend          # Backend container
├── Dockerfile.frontend         # Frontend container
├── docker-compose.yml          # Full-stack orchestration
├── core/
│   ├── orchestrator.py         # Concurrent agent runner + SSE streaming
│   ├── llm.py                  # Provider-agnostic LLM client (retry, timeout)
│   ├── search.py               # Web search + 4-tier trust classification
│   └── agent_utils.py          # Shared metadata parsing utilities
├── agents/
│   ├── news.py                 # Breaking news & events agent
│   ├── competitor.py           # Competitive landscape agent
│   ├── business_model.py       # Revenue & unit economics agent
│   ├── risk.py                 # Risk identification & scoring agent
│   ├── opportunity.py          # Growth signal identification agent
│   └── verdict.py              # Cross-agent synthesis & recommendation
└── frontend/
    ├── app/                    # Next.js App Router pages
    ├── components/dashboard/   # Executive dashboard UI components
    ├── hooks/                  # useAgentStream SSE hook
    └── lib/                    # Utilities
```

---

## 🔒 Security

- `.env` files are `.gitignore`d — API keys never touch version control
- All API keys are server-side only — the frontend never sees them
- The LLM client validates responses before parsing

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Fireworks AI** — AMD-accelerated model inference
- **Serper** — Google Search API for real-time web grounding
- **Vercel v0** — Executive dashboard design generation
- **shadcn/ui** — UI component primitives
- **Recharts** — Data visualization
