# Competitive Intelligence Agent 🚀

An autonomous, multi-agent AI system designed to generate institutional-grade competitive intelligence and investment research on technology startups. This application utilizes a highly coordinated cluster of AI agents to scour recent data, assess business fundamentals, and deliver a final, brutally objective investment verdict.

## 🌟 Key Features

*   **Multi-Agent Architecture**: Five specialized researcher agents (News, Competitor, Business Model, Risk, and Opportunity) independently analyze data, followed by a meta-Verdict Agent that synthesizes the findings into a final recommendation.
*   **Institutional-Grade Reasoning**: Agents are strictly calibrated to avoid marketing fluff. They highlight internal data conflicts, enforce confidence ceilings (capping at 7/10 unless high-quality Tier 1 sources are present), and expose missing information.
*   **Source Trust Tiering**: The system actively classifies evidence quality, deprioritizing unverified social media claims (Tier 4) in favor of audited financials, official corporate statements, and credible financial journalism (Tier 1 & 2).
*   **Executive Dashboard UI**: A sleek, dark-mode, glassmorphism dashboard built with React that presents the "Bottom Line Up Front" (BLUF), live-streaming the agents' reasoning as they work.

## 🏗️ Architecture

1.  **Backend (Python & Google Antigravity SDK)**
    *   Orchestrates the multi-agent workflows.
    *   Executes real-time searches via the `ExaSearchTool`.
    *   Streams reasoning and metadata back to the client using Server-Sent Events (SSE).
2.  **Frontend (React, Vite)**
    *   Responsive, premium dashboard interface.
    *   Dynamically handles the SSE stream to build the agent cards and verdict state live.
    *   Visualizes Data Quality, Risk Severities, and Confidence Metrics.

## 🚀 Getting Started

### Prerequisites
*   Python 3.10+
*   Node.js (v18+) & npm
*   API keys for Google Antigravity SDK and Exa Search.

### 1. Backend Setup

Navigate to the project root:

```bash
# 1. Set up your Python environment (Optional but recommended)
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure your Environment Variables
# Create a .env file in the root directory (this file is git-ignored for your security)
cp .env.example .env
```

**Inside your `.env` file, add:**
```ini
# Add your required API keys here
EXA_API_KEY=your_exa_api_key_here
```

**Run the Backend Server:**
```bash
python server.py
# The SSE stream will be available at http://localhost:8000
```

### 2. Frontend Setup

Open a new terminal tab and navigate to the `frontend` directory:

```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Run the development server
npm run dev
# The UI will be accessible at http://localhost:5173
```

## 🔒 Security & Data Privacy

This repository uses a `.gitignore` to ensure that:
*   `.env` files (containing your API keys and secrets) are NEVER pushed to GitHub.
*   Local logs and compiled Python cache files (`__pycache__`) are excluded.
*   `node_modules` and frontend build artifacts are excluded.

**Never commit your API keys.** Always use the `.env` file for local development.

## 🛠️ Tech Stack
*   **AI SDK:** Google Antigravity (AGY) SDK
*   **Backend:** Python, FastAPI/SSE
*   **Frontend:** React, Vite, Vanilla CSS (Glassmorphism UI)
*   **Fonts:** Google Fonts (Outfit, Inter)

## 📄 License
MIT License
