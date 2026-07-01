import React from 'react';
import ConfidenceMeter from './ConfidenceMeter';

export default function VerdictCard({ verdictData }) {
  const { status, verdict, confidence, reasoning, cross_agent_conflicts, trade_off, key_decision_drivers, strongest_supporting_evidence, strongest_opposing_evidence, what_would_change_this } = verdictData;

  if (status === 'idle' || status === 'loading') return null;

  if (status === 'error') {
    return (
      <div className="verdict-card" style={{ '--agent-color': '#ef4444' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '2rem', textAlign: 'center', textTransform: 'uppercase', color: '#ef4444' }}>
          Verdict Analysis Failed
        </h2>
        <div style={{ color: '#ef4444', fontSize: '18px', textAlign: 'center' }}>
          {reasoning || 'An unknown error occurred while generating the final recommendation.'}
        </div>
      </div>
    );
  }

  const verdictColors = {
    INVEST: '#10b981', // emerald-500
    PARTNER: '#f59e0b', // amber-500
    AVOID: '#ef4444', // red-500
    WATCH: '#8b5cf6', // violet-500
  };

  const badgeColor = verdictColors[verdict?.toUpperCase()] || '#94a3b8';

  return (
    <div className="verdict-card" style={{ '--agent-color': badgeColor }}>
      <h2 style={{ margin: '0 0 24px 0', fontSize: '2.5rem', textAlign: 'center', textTransform: 'uppercase', background: `linear-gradient(to right, ${badgeColor}, #f8fafc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Final Recommendation
      </h2>
      
      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, gap: '20px' }}>
          <div style={{
            backgroundColor: badgeColor,
            color: 'white',
            fontWeight: '800',
            fontSize: '2rem',
            padding: '16px 32px',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: `0 8px 24px ${badgeColor}40`,
            textAlign: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {verdict}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '12px' }}>
              Confidence
            </span>
            <ConfidenceMeter confidence={confidence} color={badgeColor} />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '300px', textAlign: 'left' }}>
          
          {cross_agent_conflicts && cross_agent_conflicts.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderLeft: '4px solid #f59e0b',
              padding: '16px',
              borderRadius: '0 8px 8px 0'
            }}>
              <div style={{ fontSize: '14px', letterSpacing: '0.05em', fontWeight: 'bold', color: '#fcd34d', marginBottom: '8px' }}>
                ⚠ CROSS-AGENT CONFLICTS
              </div>
              <div style={{ color: '#fde68a', fontSize: '16px', whiteSpace: 'pre-wrap' }}>
                {cross_agent_conflicts}
              </div>
            </div>
          )}

          {key_decision_drivers && (
            <>
              <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
              <div>
                <div style={{ fontSize: '13px', letterSpacing: '0.05em', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  KEY DECISION DRIVERS
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '16px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {key_decision_drivers}
                </div>
              </div>
            </>
          )}

          {(strongest_supporting_evidence || strongest_opposing_evidence) && (
            <>
              <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {strongest_supporting_evidence && (
                  <div style={{ flex: 1, minWidth: '200px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981', padding: '16px', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ fontSize: '13px', letterSpacing: '0.05em', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '8px' }}>
                      ✓ STRONGEST SUPPORTING EVIDENCE
                    </div>
                    <div style={{ color: '#a7f3d0', fontSize: '15px', lineHeight: 1.6 }}>
                      {strongest_supporting_evidence}
                    </div>
                  </div>
                )}
                {strongest_opposing_evidence && (
                  <div style={{ flex: 1, minWidth: '200px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ fontSize: '13px', letterSpacing: '0.05em', fontWeight: 'bold', color: '#fca5a5', marginBottom: '8px' }}>
                      ✗ STRONGEST OPPOSING EVIDENCE
                    </div>
                    <div style={{ color: '#fecaca', fontSize: '15px', lineHeight: 1.6 }}>
                      {strongest_opposing_evidence}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {trade_off && (
            <>
              <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
              <div>
                <div style={{ fontSize: '13px', letterSpacing: '0.05em', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  CORE TRADE-OFF
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '17px' }}>
                  {trade_off}
                </div>
              </div>
            </>
          )}

          {what_would_change_this && (
            <>
              <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
              <div>
                <div style={{ fontSize: '13px', letterSpacing: '0.05em', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  WHAT WOULD CHANGE THIS VERDICT
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '16px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {what_would_change_this}
                </div>
              </div>
            </>
          )}

          <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
          
          <div className="verdict-reasoning">
            <h3 style={{ fontSize: '14px', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              REASONING
            </h3>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.8, fontSize: '17px', whiteSpace: 'pre-wrap' }}>
              {reasoning}
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
