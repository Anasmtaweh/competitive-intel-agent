# 🔍 Competitive Intelligence Agent

> **Institutional-grade competitive analysis in under 60 seconds.**

An autonomous swarm of 6 specialized AI agents that performs real-time competitive intelligence. It analyzes breaking news, maps competitive positioning, dissects business models, scores risk vectors, and identifies growth catalysts. It then synthesizes these findings into a definitive, evidence-backed executive recommendation.

Built for founders, investors, and analysts who require Bloomberg Terminal-level insights without the massive price tag or the hallucinations of standard LLMs.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![Fireworks AI](https://img.shields.io/badge/Fireworks_AI-AMD_Hardware-FF6B35)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 What It Actually Does

Type a company name. The system instantly validates the entity, fires off 5 concurrent research agents, and streams the results in real-time. You get a completely sourced dashboard showing:

| Agent | Role | Output |
|-------|------|--------|
| 📰 **News Agent** | Scans for funding rounds, acquisitions, lawsuits, and executive changes. | Sourced breaking news with recency timestamps. |
| ⚔️ **Competitor Agent** | Maps competitive landscape and market positioning against top rivals. | Competitive moat analysis and head-to-head comparisons. |
| 💰 **Business Model Agent** | Evaluates revenue streams, pricing strategies, and unit economics. | Financial sustainability assessment. |
| 🚨 **Risk Agent** | Identifies downside vectors. | Risks scored deterministically by Impact × Likelihood (0-100). |
| 🚀 **Opportunity Agent** | Surfaces growth catalysts and strategic pivots. | Opportunities scored by Impact × Likelihood (0-100). |
| ⚖️ **Verdict Agent** | Cross-references the swarm's findings and issues a final recommendation. | **INVEST / PARTNER / WATCH / AVOID** with decision sensitivity analysis. |

---

## 🧠 The Architecture

No bloated frameworks (no LangChain, no CrewAI). Just pure, highly optimized Python and `asyncio` for maximum control and minimum latency.

```mermaid
graph TD
    User([User Input]) --> NextJS[Next.js Frontend]
    NextJS -- "POST /api/stream" --> FastAPI[FastAPI Backend]
    
    subgraph Orchestration
        FastAPI --> Gatekeeper{Valid Tech Company?}
        Gatekeeper -- "INVALID" --> Error[Halt & Return Error]
        Gatekeeper -- "VALID" --> Orchestrator[Asyncio Orchestrator]
    end

    subgraph Agent Swarm
        Orchestrator -->|Concurrent Search & Synthesis| News[News Agent]
        Orchestrator --> Competitor[Competitor Agent]
        Orchestrator --> Business[Business Model Agent]
        Orchestrator --> Risk[Risk Agent]
        Orchestrator --> Opp[Opportunity Agent]
    end

    subgraph Synthesis
        News & Competitor & Business & Risk & Opp --> Verdict[Verdict Agent]
    end

    Agent Swarm -- "SSE Stream (Real-Time)" --> NextJS
    Verdict -- "Final Verdict & Reasoning" --> NextJS
    
    subgraph Context-Aware Chat
        NextJS -- "POST /api/chat (with history)" --> Chat[Chat Agent]
        Chat --> Router{Live Search Needed?}
        Router -- "Yes" --> LiveSearch[Search Engine]
        Router -- "No" --> LLM[LLM Response]
        LiveSearch --> LLM
        LLM -- "SSE Stream" --> NextJS
    end
```

---

## 🛡️ The Evidence Engine (Anti-Hallucination)

Standard AI wrappers hallucinate financial metrics. We built a deterministic Evidence Engine to prevent this.

1. **Deterministic Trust Tiers:** Every source URL is mathematically scored based on a 4-tier domain classification system (Tier 1 = Bloomberg/WSJ, Tier 4 = Reddit/Forums).
2. **Evidence Quality Receipts:** The UI explicitly shows you *exactly* how the evidence score was calculated (e.g., 2 Tier 1 sources × weight + 4 Tier 3 sources × weight).
3. **Freshness Decay:** Intelligence rots fast. Sources older than 6 months trigger a freshness penalty multiplier, downgrading the agent's confidence score and forcing reliance on current data.
4. **Diverse Sourcing Rule:** A citation validator ensures agents synthesize information across multiple unique domains, preventing "single-source dependency" where an agent blindly trusts one biased article.
5. **Intelligence Gaps Analysis:** The Verdict Agent explicitly lists what data it *couldn't* find (e.g., "Exact profit margins missing") and calculates how much those gaps impact its final confidence score.

---

## 💬 Context-Aware Memory Chat

The dashboard includes a stateful chat panel. It doesn't just read the final report—it actively remembers the last 6 conversational turns and routes queries. If you ask a question that requires new information not found in the baseline report, the Chat Agent autonomously triggers a live web search before answering.

---

## 🖥️ Executive Dashboard UI

A dark-mode, glassmorphism-styled dashboard built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **shadcn/ui**.

- **Recommendation Hero:** Verdict badge with animated confidence rings.
- **Decision Sensitivity:** Explicit conditions that would flip the verdict (e.g., "Flip to Invest if...").
- **Data Quality Donut:** Recharts pie chart showing the exact distribution of source tiers.
- **Signal Bars:** Visual breakdown of Risks and Opportunities by their calculated Severity scores.

---

## ⚡ AMD Platform Usage

This project runs inference through **Fireworks AI**, which hosts models on **AMD Instinct GPUs**. 

- **LLM Provider:** Fireworks AI (AMD hardware)
- **Active Model:** `qwen3p7-plus` 
- **Performance:** All 6 agents route through the AMD-accelerated endpoint concurrently, cutting wall-clock time from 3 minutes to ~40 seconds.
- **Provider-Agnostic:** Want to swap to another OpenAI-compatible endpoint? Change 3 environment variables in `.env`. Zero code changes required.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys for Fireworks AI and a search provider (Serper, Brave, or Tavily)

### 1. Clone & Setup Backend
```bash
git clone https://github.com/YOUR_USERNAME/competitive-intelligence-agent.git
cd competitive-intelligence-agent
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment
Create a `.env` file in the root:
```env
# LLM Configuration
LLM_BASE_URL=https://api.fireworks.ai/inference/v1
LLM_API_KEY=your_fireworks_api_key
LLM_MODEL=accounts/fireworks/models/qwen3p7-plus

# Search Provider (at least one required)
SERPER_API_KEY=your_serper_key
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

### 4. Run the Application
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

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
docker-compose up --build
```
Available at **http://localhost:3000**.

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

## 🔒 Security
- **Gatekeeper Validation:** Blocks execution on non-tech/AI company inputs.
- API keys are completely server-side and `gitignore`d.
- Strict LLM JSON parsing and validation before rendering to the client.

## 📄 License
MIT License — see [LICENSE](LICENSE) for details.
