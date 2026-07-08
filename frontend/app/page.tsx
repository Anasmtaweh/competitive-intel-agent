"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RecommendationHero } from "@/components/dashboard/recommendation-hero"
import { DataQualityCard } from "@/components/dashboard/data-quality-card"
import { SignalBarsCard } from "@/components/dashboard/signal-bars-card"
import { AgentReportCard } from "@/components/dashboard/agent-report-card"
import { ChatPanel } from "@/components/dashboard/chat-panel"
import { useAgentStream } from "@/hooks/useAgentStream"
import { useMemo, useState } from "react"

export default function Page() {
  const { agents, verdict, isStreaming, error, startAnalysis } = useAgentStream();
  const [currentCompany, setCurrentCompany] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleSearch = (company) => {
    setCurrentCompany(company);
    startAnalysis(company, apiKey);
  };

  // Prepare data for AgentReportCard
  const reports = useMemo(() => {
    return [
      {
        title: "Recent News",
        id: "news",
        data: agents.news,
      },
      {
        title: "Competitive Position",
        id: "competitor",
        data: agents.competitor,
      },
      {
        title: "Business Model",
        id: "business_model",
        data: agents.business_model,
      },
    ];
  }, [agents]);

  const isAnalysisComplete = verdict?.status === 'complete' || verdict?.status === 'error';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[98vw] flex-col gap-8 px-5 pb-20 md:px-8">
      <DashboardHeader 
        onSearch={handleSearch} 
        isStreaming={isStreaming} 
        apiKey={apiKey} 
        setApiKey={setApiKey} 
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {isAnalysisComplete && (
        <RecommendationHero verdictData={verdict} />
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <DataQualityCard agents={agents} />
        
        <SignalBarsCard
          title="Risk Analysis"
          subtitle="Identified downside vectors"
          items={agents.risk?.risks || []}
          barColor="var(--verdict-avoid)"
        />
        
        <SignalBarsCard
          title="Growth Signals"
          subtitle="Positive momentum vectors"
          items={agents.opportunity?.opportunities || []}
          barColor="var(--verdict-invest)"
          positive
        />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {reports.map((report) => (
          <AgentReportCard key={report.id} report={report} />
        ))}
      </div>
      
      <ChatPanel 
        company={currentCompany} 
        agents={agents} 
        verdict={verdict} 
        isEnabled={isAnalysisComplete} 
        apiKey={apiKey}
      />
    </main>
  )
}
