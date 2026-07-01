import React, { useState } from 'react';
import './App.css';
import CompanyInput from './components/CompanyInput';
import AgentCard from './components/AgentCard';
import RiskBars from './components/RiskBars';
import VerdictCard from './components/VerdictCard';
import DataQualityCard from './components/DataQualityCard';

function App() {
  const [company, setCompany] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [useExecutiveLayout, setUseExecutiveLayout] = useState(true);
  const [agents, setAgents] = useState({
    news:           { status: 'idle', output: '', sources: [], risks: [], opportunities: [], latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, missingInformation: null, internalConflicts: null, unverifiedCitationCount: 0 },
    competitor:     { status: 'idle', output: '', sources: [], risks: [], opportunities: [], latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, missingInformation: null, internalConflicts: null, unverifiedCitationCount: 0 },
    business_model: { status: 'idle', output: '', sources: [], risks: [], opportunities: [], latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, missingInformation: null, internalConflicts: null, unverifiedCitationCount: 0 },
    risk:           { status: 'idle', output: '', sources: [], risks: [], opportunities: [], latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, missingInformation: null, internalConflicts: null, unverifiedCitationCount: 0 },
    opportunity:    { status: 'idle', output: '', sources: [], risks: [], opportunities: [], latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, missingInformation: null, internalConflicts: null, unverifiedCitationCount: 0 },
  });
  const [verdict, setVerdict] = useState({
    status: 'idle',
    verdict: null,
    confidence: null,
    reasoning: '',
    cross_agent_conflicts: null,
    trade_off: '',
    key_decision_drivers: '',
    strongest_supporting_evidence: '',
    strongest_opposing_evidence: '',
    what_would_change_this: '',
  });

  const handleSubmit = () => {
    if (!company.trim() || isStreaming) return;
    
    setIsStreaming(true);
    setVerdict({ status: 'idle', verdict: null, confidence: null, reasoning: '', cross_agent_conflicts: null, trade_off: '', key_decision_drivers: '', strongest_supporting_evidence: '', strongest_opposing_evidence: '', what_would_change_this: '' });
    setAgents(prev =>
      Object.fromEntries(
        Object.keys(prev).map(k => [k, { status: 'loading', output: '', sources: [], risks: [], opportunities: [], latestDate: null, sourceQuality: {}, confidence: null, evidenceQuality: null, missingInformation: null, internalConflicts: null }])
      )
    );

    const es = new EventSource(
      `http://localhost:8000/api/stream?company=${encodeURIComponent(company)}`
    );

    es.onmessage = (event) => {
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
    };

    es.onerror = () => {
      setIsStreaming(false);
      es.close();
    };
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Competitive Intelligence Agent</h1>
        <p className="tagline">AI Startup Analysis</p>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setUseExecutiveLayout(true)}
            style={{ padding: '8px 16px', background: useExecutiveLayout ? 'var(--primary)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: '600', transition: 'all 0.2s' }}>
            Executive Dashboard
          </button>
          <button 
            onClick={() => setUseExecutiveLayout(false)}
            style={{ padding: '8px 16px', background: !useExecutiveLayout ? 'var(--primary)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: '600', transition: 'all 0.2s' }}>
            Original Layout
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <CompanyInput 
          company={company}
          onCompanyChange={setCompany}
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
        />

        {useExecutiveLayout ? (
          <div className="layout-executive">
            {/* Top: Verdict (if present) */}
            {(verdict.status === 'complete' || verdict.status === 'error') && (
              <div style={{ marginBottom: '24px' }}>
                <VerdictCard verdictData={verdict} />
              </div>
            )}
            
            {/* Middle: Data & Risk Row */}
            <div className="agents-grid executive-visuals-grid" style={{ marginBottom: '24px' }}>
              <DataQualityCard allAgents={['news', 'competitor', 'business_model', 'risk', 'opportunity']} agents={agents} />
              <AgentCard agentName="risk" label="Risk Analysis" agentData={agents.risk}>
                {agents.risk.risks && agents.risk.risks.length > 0 && (
                  <RiskBars risks={agents.risk.risks} />
                )}
              </AgentCard>
              <AgentCard agentName="opportunity" label="Growth Signals" agentData={agents.opportunity} />
            </div>

            {/* Bottom: Text Analysis Row */}
            <div className="agents-grid executive-text-grid">
              <AgentCard agentName="news" label="Recent News" agentData={agents.news} />
              <AgentCard agentName="competitor" label="Competitive Position" agentData={agents.competitor} />
              <AgentCard agentName="business_model" label="Business Model" agentData={agents.business_model} />
            </div>
          </div>
        ) : (
          <div className="layout-original">
            <div className="agents-grid">
              <AgentCard agentName="news" label="Recent News" agentData={agents.news} />
              <AgentCard agentName="competitor" label="Competitive Position" agentData={agents.competitor} />
              <AgentCard agentName="business_model" label="Business Model" agentData={agents.business_model} />
              <AgentCard agentName="risk" label="Risk Analysis" agentData={agents.risk}>
                {agents.risk.risks && agents.risk.risks.length > 0 && (
                  <RiskBars risks={agents.risk.risks} />
                )}
              </AgentCard>
              <AgentCard agentName="opportunity" label="Growth Signals" agentData={agents.opportunity} />
              <DataQualityCard allAgents={['news', 'competitor', 'business_model', 'risk', 'opportunity']} agents={agents} />
            </div>

            {(verdict.status === 'complete' || verdict.status === 'error') && <VerdictCard verdictData={verdict} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
