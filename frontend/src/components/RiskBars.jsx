import React from 'react';

export default function RiskBars({ risks }) {
  if (!risks || risks.length === 0) return null;

  const severityConfig = {
    HIGH:   { color: '#dc2626' },
    MEDIUM: { color: '#d97706' },
    LOW:    { color: '#16a34a' },
  };

  return (
    <div className="risk-bars-container">
      {risks.map((risk, idx) => {
        const config = severityConfig[risk.severity?.toUpperCase()] || severityConfig.LOW;
        const fillWidth = risk.risk_score ? `${risk.risk_score}%` : '50%';
        
        return (
          <div key={idx} className="risk-bar-item">
            <div className="risk-bar-header">
              <span className="risk-name">{risk.name}</span>
              <span className="risk-severity" style={{ color: config.color }}>
                {risk.severity}
              </span>
            </div>
            <div className="risk-bar-track">
              <div 
                className="risk-bar-fill" 
                style={{ 
                  backgroundColor: config.color, 
                  width: fillWidth 
                }} 
              />
            </div>
            {(risk.impact != null || risk.likelihood != null) && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {risk.impact != null && <span>Impact: {risk.impact}/10</span>}
                {risk.likelihood != null && <span>Likelihood: {risk.likelihood}/10</span>}
                {risk.risk_score != null && <span>Score: {risk.risk_score}/100</span>}
              </div>
            )}
            <p className="risk-description">{risk.description}</p>
          </div>
        );
      })}
    </div>
  );
}
