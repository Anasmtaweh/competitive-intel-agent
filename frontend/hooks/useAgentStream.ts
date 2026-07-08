import { useState, useCallback } from 'react';

export type AgentState = {
  status: 'idle' | 'loading' | 'complete' | 'error';
  output: string;
  sources: Array<any>;
  risks: Array<any>;
  opportunities: Array<any>;
  latestDate: string | null;
  sourceQuality: any;
  confidence: number | null;
  evidenceQuality: number | null;
  missingInformation: string | null;
  internalConflicts: string | null;
  unverifiedCitationCount: number;
  evidenceReceipt: any | null;
  freshnessAdjusted: boolean;
};

export type VerdictState = {
  status: 'idle' | 'loading' | 'complete' | 'error';
  verdict: string | null;
  confidence: number | null;
  reasoning: string;
  cross_agent_conflicts: string | null;
  trade_off: string;
  key_decision_drivers: string;
  strongest_supporting_evidence: string;
  strongest_opposing_evidence: string;
  what_would_change_this: string;
  stability: string | null;
  stability_reason: string | null;
  what_would_flip_to_invest: string | null;
  what_would_flip_to_avoid: string | null;
  intelligence_gaps: any[];
};

const initialAgentState: AgentState = { 
  status: 'idle', output: '', sources: [], risks: [], opportunities: [], 
  latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, 
  missingInformation: null, internalConflicts: null, unverifiedCitationCount: 0,
  evidenceReceipt: null, freshnessAdjusted: false
};

const initialVerdictState: VerdictState = {
  status: 'idle', verdict: null, confidence: null, reasoning: '',
  cross_agent_conflicts: null, trade_off: '', key_decision_drivers: '',
  strongest_supporting_evidence: '', strongest_opposing_evidence: '', what_would_change_this: '',
  stability: null, stability_reason: null, what_would_flip_to_invest: null, 
  what_would_flip_to_avoid: null, intelligence_gaps: []
};

export function useAgentStream() {
  const [agents, setAgents] = useState<{ [key: string]: AgentState }>({
    news: { ...initialAgentState },
    competitor: { ...initialAgentState },
    business_model: { ...initialAgentState },
    risk: { ...initialAgentState },
    opportunity: { ...initialAgentState },
  });

  const [verdict, setVerdict] = useState<VerdictState>({ ...initialVerdictState });

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback((company: string) => {
    if (!company.trim() || isStreaming) return;

    // Reset state — match old frontend exactly
    setIsStreaming(true);
    setVerdict({ ...initialVerdictState });
    setAgents(prev =>
      Object.fromEntries(
        Object.keys(prev).map(k => [k, { ...initialAgentState, status: 'loading' as const }])
      ) as any
    );
    setError(null);

    // Correct URL: /api/stream?company=...
    const es = new EventSource(
      `http://localhost:8000/api/stream?company=${encodeURIComponent(company)}`
    );

    // The backend sends UNNAMED SSE events (just `data: {...}\n\n`)
    // We discriminate by the `type` field inside the JSON payload
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'agent_complete') {
          setAgents(prev => ({
            ...prev,
            [data.agent]: {
              status: 'complete',
              output: data.output,
              sources: data.sources || [],
              risks: data.risks || [],
              opportunities: data.opportunities || [],
              latestDate: data.latest_date || null,
              sourceQuality: data.source_quality || {},
              confidence: data.confidence || null,
              evidenceQuality: data.evidence_quality || null,
              missingInformation: data.missing_information || null,
              internalConflicts: data.internal_conflicts || null,
              unverifiedCitationCount: data.unverified_citation_count || 0,
              evidenceReceipt: data.evidence_receipt || null,
              freshnessAdjusted: data.freshness_adjusted || false,
            },
          }));
        } else if (data.type === 'verdict_complete') {
          setVerdict({
            status: 'complete',
            verdict: data.verdict,
            confidence: data.confidence,
            reasoning: data.reasoning,
            cross_agent_conflicts: data.cross_agent_conflicts || null,
            trade_off: data.trade_off || '',
            key_decision_drivers: data.key_decision_drivers || '',
            strongest_supporting_evidence: data.strongest_supporting_evidence || '',
            strongest_opposing_evidence: data.strongest_opposing_evidence || '',
            what_would_change_this: data.what_would_change_this || '',
            stability: data.stability || null,
            stability_reason: data.stability_reason || null,
            what_would_flip_to_invest: data.what_would_flip_to_invest || null,
            what_would_flip_to_avoid: data.what_would_flip_to_avoid || null,
            intelligence_gaps: data.intelligence_gaps || [],
          });
          setIsStreaming(false);
          es.close();
        } else if (data.type === 'error') {
          if (data.agent === 'verdict') {
            setVerdict({
              status: 'error',
              verdict: 'ERROR',
              confidence: 0,
              reasoning: data.message,
              cross_agent_conflicts: null,
              trade_off: '',
              key_decision_drivers: '',
              strongest_supporting_evidence: '',
              strongest_opposing_evidence: '',
              what_would_change_this: '',
            });
            setIsStreaming(false);
            es.close();
          } else {
            setAgents(prev => ({
              ...prev,
              [data.agent]: { ...prev[data.agent], status: 'error', output: data.message },
            }));
          }
        }
      } catch (err) {
        console.error("Error parsing SSE event", err);
      }
    };

    es.onerror = () => {
      setError("Connection to backend lost or failed.");
      setIsStreaming(false);
      es.close();
    };

  }, [isStreaming]);

  return { agents, verdict, isStreaming, error, startAnalysis };
}

