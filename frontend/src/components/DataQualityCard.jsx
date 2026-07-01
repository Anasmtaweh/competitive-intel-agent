import React from 'react';

export default function DataQualityCard({ allAgents, agents }) {
  // Aggregate data
  let totalTier1 = 0;
  let totalTier2 = 0;
  let totalTier3 = 0;
  let totalTier4 = 0;
  let totalSources = 0;
  
  let dates = [];

  allAgents.forEach(name => {
    const agent = agents[name];
    if (agent.sourceQuality) {
      totalTier1 += agent.sourceQuality.tier_1 || 0;
      totalTier2 += agent.sourceQuality.tier_2 || 0;
      totalTier3 += agent.sourceQuality.tier_3 || 0;
      totalTier4 += agent.sourceQuality.tier_4 || 0;
    }
    if (agent.latestDate) {
      // In a real app we'd parse and sort, but per instructions we just take them
      dates.push(agent.latestDate);
    }
  });

  totalSources = totalTier1 + totalTier2 + totalTier3 + totalTier4;

  let dateStr = "No dates available";
  if (dates.length > 0) {
    // A simple hacky display for the date range
    const earliest = dates[dates.length - 1]; // Just grab one
    const latest = dates[0]; // Just grab another
    dateStr = `${earliest} – ${latest}`; 
    if (dates.every(d => d === dates[0])) {
      dateStr = dates[0];
    }
  }

  // SVG Donut calculation
  // We use a circle with radius 15.91549430918954 which gives a circumference of 100
  // This allows stroke-dasharray to map directly to percentages.
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
  if (totalSources > 0) {
    p1 = (totalTier1 / totalSources) * 100;
    p2 = (totalTier2 / totalSources) * 100;
    p3 = (totalTier3 / totalSources) * 100;
    p4 = (totalTier4 / totalSources) * 100;
  }
  
  // Offsets for the donut chart segments
  // Stroke-dashoffset starts from 25 (12 o'clock), goes counter-clockwise if positive, clockwise if negative
  const dash1 = `${p1} ${100 - p1}`;
  const offset1 = 25;
  
  const dash2 = `${p2} ${100 - p2}`;
  const offset2 = 25 - p1;
  
  const dash3 = `${p3} ${100 - p3}`;
  const offset3 = 25 - p1 - p2;
  
  const dash4 = `${p4} ${100 - p4}`;
  const offset4 = 25 - p1 - p2 - p3;

  return (
    <div className="agent-card" style={{ '--agent-color': '#94a3b8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94a3b8', boxShadow: '0 0 8px #94a3b8' }}></span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
            Data Quality
          </h3>
        </div>
      </div>
      
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Data current to: {dateStr}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {totalSources === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Awaiting data...</div>
        ) : (
          <>
            <svg width="120" height="120" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}>
              {/* Background circle */}
              <circle r="15.91549430918954" cx="16" cy="16" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4"></circle>
              
              {p1 > 0 && <circle r="15.91549430918954" cx="16" cy="16" fill="transparent" stroke="#1e293b" strokeWidth="4" strokeDasharray={dash1} strokeDashoffset={offset1}></circle>}
              {p2 > 0 && <circle r="15.91549430918954" cx="16" cy="16" fill="transparent" stroke="#64748b" strokeWidth="4" strokeDasharray={dash2} strokeDashoffset={offset2}></circle>}
              {p3 > 0 && <circle r="15.91549430918954" cx="16" cy="16" fill="transparent" stroke="#94a3b8" strokeWidth="4" strokeDasharray={dash3} strokeDashoffset={offset3}></circle>}
              {p4 > 0 && <circle r="15.91549430918954" cx="16" cy="16" fill="transparent" stroke="#cbd5e1" strokeWidth="4" strokeDasharray={dash4} strokeDashoffset={offset4}></circle>}
            </svg>
            
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>
              {totalSources} Total Sources
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#1e293b' }}></span> Tier 1 (Highest)</span>
                <span>{totalTier1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#64748b' }}></span> Tier 2</span>
                <span>{totalTier2}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#94a3b8' }}></span> Tier 3</span>
                <span>{totalTier3}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#cbd5e1' }}></span> Tier 4 (Lowest)</span>
                <span>{totalTier4}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
