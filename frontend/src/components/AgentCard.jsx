import React from 'react';

const AGENT_COLORS = {
  news: '#3b82f6',
  competitor: '#f97316',
  business_model: '#10b981',
  risk: '#ef4444',
  opportunity: '#8b5cf6',
};

export default function AgentCard({ agentName, label, agentData, children }) {
  const { status, output, sources, error, risks, opportunities, latestDate, sourceQuality, confidence, evidenceQuality, missingInformation, internalConflicts, unverifiedCitationCount } = agentData;
  const accentColor = AGENT_COLORS[agentName] || '#6b7280';

  // Calculate proportional squares
  let squares = [];
  if (sourceQuality && sourceQuality.total > 0) {
    const total = sourceQuality.total;
    let t1 = Math.round((sourceQuality.tier_1 / total) * 6);
    let t2 = Math.round((sourceQuality.tier_2 / total) * 6);
    let t3 = Math.round((sourceQuality.tier_3 / total) * 6);
    let t4 = Math.round((sourceQuality.tier_4 / total) * 6);
    
    // Adjust if rounding error causes it to not equal 6
    const sum = t1 + t2 + t3 + t4;
    if (sum < 6) t4 += (6 - sum);
    else if (sum > 6 && t4 > 0) t4 -= (sum - 6);

    for (let i = 0; i < t1; i++) squares.push('#1e293b');
    for (let i = 0; i < t2; i++) squares.push('#64748b');
    for (let i = 0; i < t3; i++) squares.push('#94a3b8');
    for (let i = 0; i < Math.max(0, t4); i++) squares.push('#cbd5e1');
    squares = squares.slice(0, 6); // just in case
  }

  const renderOutput = (text) => {
    if (!text) return null;
    const parts = text.split(/(\(historical\)|historical)/gi);
    return parts.map((part, i) => {
      if (part.toLowerCase() === '(historical)' || part.toLowerCase() === 'historical') {
        return <span key={i} className="badge-historical">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className={`agent-card status-${status}`} style={{ '--agent-color': accentColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}></span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
            {label}
          </h3>
        </div>
        <span className="agent-status-badge">
          {status === 'idle' && 'Waiting...'}
          {status === 'loading' && '⏳ Analyzing...'}
          {status === 'complete' && '✓ Complete'}
          {status === 'error' && '✗ Error'}
        </span>
      </div>

      {status === 'complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
          {latestDate && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Data current to: {latestDate}</div>}
          {sourceQuality && sourceQuality.total > 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>Source quality:</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {squares.map((c, i) => (
                  <div key={i} style={{ width: '8px', height: '8px', backgroundColor: c }}></div>
                ))}
              </div>
              <span>T1: {sourceQuality.tier_1} T2: {sourceQuality.tier_2} T3: {sourceQuality.tier_3} T4: {sourceQuality.tier_4}</span>
            </div>
          )}
        </div>
      )}

      {status === 'complete' && unverifiedCitationCount > 0 && (
        <div className="badge-unverified" style={{ marginBottom: '12px' }}>
          ⚠ {unverifiedCitationCount} Unverified Citation{unverifiedCitationCount !== 1 ? 's' : ''}
        </div>
      )}

      {status === 'complete' && (confidence != null || evidenceQuality != null) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {confidence != null && <span>🎯 Confidence: <strong style={{ color: 'var(--text-main)' }}>{confidence}/10</strong></span>}
          {evidenceQuality != null && <span>📊 Evidence Quality: <strong style={{ color: 'var(--text-main)' }}>{evidenceQuality}/10</strong></span>}
        </div>
      )}

      {status === 'complete' && missingInformation && (
        <div style={{ fontSize: '12px', color: '#fcd34d', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px', borderLeft: '3px solid #d97706' }}>
          <strong>Missing:</strong> {missingInformation}
        </div>
      )}

      {status === 'complete' && internalConflicts && (
        <div style={{ fontSize: '12px', color: '#fca5a5', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px', borderLeft: '3px solid #dc2626' }}>
          <strong>⚠ Internal conflict:</strong> {internalConflicts}
        </div>
      )}

      <div className="agent-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {status === 'idle' && <p className="text-muted" style={{ fontSize: '16px' }}>Awaiting analysis...</p>}
        {status === 'error' && <p className="text-error" style={{ fontSize: '16px' }}>{error || 'An error occurred'}</p>}
        
        {status === 'loading' && (
          <div>
            <div className="skeleton" style={{ width: '100%' }}></div>
            <div className="skeleton" style={{ width: '90%' }}></div>
            <div className="skeleton" style={{ width: '95%' }}></div>
            <div className="skeleton" style={{ width: '80%' }}></div>
            <div className="skeleton" style={{ width: '85%' }}></div>
          </div>
        )}

        {status === 'complete' && (
          <>
            {children}
            {agentName === 'opportunity' && opportunities && opportunities.length > 0 && (
              <div className="risk-bars-container">
                {opportunities.map((opp, idx) => {
                  const strengthConfig = { HIGH: { color: '#10b981' }, MEDIUM: { color: '#f59e0b' }, LOW: { color: '#94a3b8' } };
                  const config = strengthConfig[opp.strength?.toUpperCase()] || strengthConfig.LOW;
                  const fillWidth = opp.opportunity_score ? `${opp.opportunity_score}%` : '50%';
                  return (
                    <div key={idx} className="risk-bar-item">
                      <div className="risk-bar-header">
                        <span className="risk-name">{opp.name}</span>
                        <span className="risk-severity" style={{ color: config.color }}>{opp.strength}</span>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill" style={{ backgroundColor: config.color, width: fillWidth }} />
                      </div>
                      {(opp.impact != null || opp.likelihood != null) && (
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {opp.impact != null && <span>Impact: {opp.impact}/10</span>}
                          {opp.likelihood != null && <span>Likelihood: {opp.likelihood}/10</span>}
                          {opp.opportunity_score != null && <span>Score: {opp.opportunity_score}/100</span>}
                        </div>
                      )}
                      <p className="risk-description">{opp.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {!(agentName === 'risk' && risks && risks.length > 0) && !(agentName === 'opportunity' && opportunities && opportunities.length > 0) && (
              <div className="agent-output" style={{ whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                {renderOutput(output)}
              </div>
            )}
          </>
        )}
      </div>

      {status === 'complete' && sources && sources.length > 0 && (
        <details className="agent-sources" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <summary style={{ fontSize: '14px' }}>Sources ({sources.length})</summary>
          <ul style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '13px', wordBreak: 'break-all' }}>
            {sources.map((url, idx) => (
              <li key={idx}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
