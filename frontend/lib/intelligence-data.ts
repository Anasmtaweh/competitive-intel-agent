export type Verdict = "INVEST" | "PARTNER" | "WATCH" | "AVOID"

export const verdictColorVar: Record<Verdict, string> = {
  INVEST: "var(--verdict-invest)",
  PARTNER: "var(--verdict-partner)",
  WATCH: "var(--verdict-watch)",
  AVOID: "var(--verdict-avoid)",
}

export interface Recommendation {
  company: string
  verdict: Verdict
  confidence: number // out of 10
  keyDrivers: string
  supportingEvidence: string
  coreTradeoff: string
  reasoning: string
}

export interface SourceTier {
  name: string
  label: string
  value: number
  color: string
}

export interface SignalBar {
  label: string
  score: number // 0-100
  severity: "High" | "Medium" | "Low"
  note: string
}

export interface Citation {
  text: string
  historical?: boolean
}

export interface AgentReport {
  title: string
  agent: string
  unverifiedCount: number
  paragraphs: string[]
  facts: Citation[]
}

export const recommendation: Recommendation = {
  company: "Anthropic",
  verdict: "INVEST",
  confidence: 7,
  keyDrivers:
    "Revenue run-rate scaled from **$1B** to **$7.4B** in under 18 months, representing **640%** year-over-year growth. Enterprise API adoption now accounts for **85%** of total revenue, signaling durable B2B demand rather than consumer hype.",
  supportingEvidence:
    "Confirmed **$13B** Series F at a **$183B** post-money valuation, led by ICONIQ with participation from Fidelity and Lightspeed. Claude models hold an estimated **32%** share of enterprise LLM API spend, second only to OpenAI's **35%**.",
  coreTradeoff:
    "Best-in-class enterprise traction and safety brand versus extreme capital intensity — projected **$27B** in compute commitments through 2027 against **65%** gross margins that remain below traditional SaaS benchmarks.",
  reasoning:
    "The investment case rests on category leadership in the fastest-growing enterprise software segment in history. Burn multiple is elevated, but revenue quality is high: net revenue retention above **140%** and a top-20 customer concentration of only **28%**. The primary risk is a compute pricing war compressing margins before scale economics arrive.",
}

export const sourceTiers: SourceTier[] = [
  { name: "tier1", label: "Tier 1 — Filings & Primary", value: 38, color: "var(--chart-1)" },
  { name: "tier2", label: "Tier 2 — Major Press", value: 31, color: "var(--chart-5)" },
  { name: "tier3", label: "Tier 3 — Trade & Analyst", value: 22, color: "var(--chart-2)" },
  { name: "tier4", label: "Tier 4 — Social & Forums", value: 9, color: "var(--chart-4)" },
]

export const risks: SignalBar[] = [
  { label: "Competition", score: 82, severity: "High", note: "OpenAI, Google DeepMind, Meta" },
  { label: "Capital Intensity", score: 74, severity: "High", note: "$27B compute commitments" },
  { label: "Regulatory", score: 55, severity: "Medium", note: "EU AI Act, US export controls" },
  { label: "Key-Person Risk", score: 41, severity: "Medium", note: "Founder-led research direction" },
  { label: "Litigation", score: 26, severity: "Low", note: "Copyright suits industry-wide" },
]

export const growthSignals: SignalBar[] = [
  { label: "Capital Raise", score: 91, severity: "High", note: "$13B Series F closed" },
  { label: "Enterprise Adoption", score: 85, severity: "High", note: "300K+ business customers" },
  { label: "Ecosystem Expansion", score: 72, severity: "High", note: "MCP protocol, agents platform" },
  { label: "Talent Density", score: 66, severity: "Medium", note: "Net inflow from rival labs" },
  { label: "International Growth", score: 54, severity: "Medium", note: "EU + APAC data residency" },
]

export const agentReports: AgentReport[] = [
  {
    title: "Recent News",
    agent: "News Intelligence Agent",
    unverifiedCount: 3,
    paragraphs: [
      "Anthropic closed a $13B Series F on September 2, 2025 at a $183B post-money valuation, roughly tripling its March 2025 mark. The round was led by ICONIQ Capital with co-leads Fidelity Management and Lightspeed Venture Partners.",
      "The company announced Claude for Enterprise expansion into financial services and government sectors, including FedRAMP High authorization — a direct challenge to incumbent gov-cloud AI vendors.",
    ],
    facts: [
      { text: "Series F closed at $183B post-money valuation (Sep 2025)" },
      { text: "Run-rate revenue crossed $7.4B, up from $1B in early 2024", historical: true },
      { text: "Rumored $350B tender offer discussion per social sources" },
      { text: "FedRAMP High authorization achieved for government workloads" },
    ],
  },
  {
    title: "Competitive Position",
    agent: "Competitor Analysis Agent",
    unverifiedCount: 1,
    paragraphs: [
      "Anthropic holds the #2 position in enterprise LLM API market share at an estimated 32%, trailing OpenAI (35%) but ahead of Google (20%). Its share of coding-assistant workloads is estimated at 42% — the highest of any lab.",
      "Differentiation rests on safety positioning, long-context performance, and the Model Context Protocol (MCP), which is emerging as the de facto standard for agent-tool interoperability across the industry.",
    ],
    facts: [
      { text: "#1 market share in code generation workloads (~42%)" },
      { text: "MCP adopted by OpenAI, Google, and Microsoft toolchains" },
      { text: "Claude 3 family benchmark leadership claims", historical: true },
      { text: "Enterprise logo overlap with OpenAI estimated at 61%" },
    ],
  },
  {
    title: "Business Model",
    agent: "Business Model Agent",
    unverifiedCount: 0,
    paragraphs: [
      "Revenue mix is approximately 85% API/enterprise and 15% consumer subscriptions — the inverse of OpenAI's consumer-heavy profile. This yields higher revenue quality but greater exposure to per-token price competition.",
      "Gross margins are estimated at 60–65% after compute costs, with committed cloud spend across AWS and Google Cloud exceeding $27B through 2027. Net revenue retention is reported above 140% for enterprise cohorts.",
    ],
    facts: [
      { text: "85% of revenue from API and enterprise contracts" },
      { text: "Net revenue retention >140% in enterprise segment" },
      { text: "Original AWS $4B investment terms", historical: true },
      { text: "Consumer Claude Pro tier ~$0.9B annualized" },
    ],
  },
]
