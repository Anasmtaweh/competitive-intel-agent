import { TriangleAlert, Dot } from "lucide-react"
import { GlassCard } from "./glass-card"

export function AgentReportCard({ report }: { report: { title: string, id: string, data: any } }) {
  const { data } = report;
  const output = data.output || "";
  const unverifiedCount = data.unverifiedCitationCount || 0;

  // Render output text with (historical) badge detection and bullet formatting
  const renderOutput = (text: string) => {
    if (!text) return <span className="text-muted-foreground">Awaiting data...</span>;

    // Split by (historical) markers first, then render
    const renderWithHistorical = (line: string, keyPrefix: string) => {
      const parts = line.split(/(\(historical\))/gi);
      return parts.map((part, i) => {
        if (part.toLowerCase() === '(historical)') {
          return (
            <span key={`${keyPrefix}-${i}`} className="ml-1 inline-flex rounded-full border border-[color:color-mix(in_oklch,var(--verdict-partner)_45%,transparent)] bg-[color:color-mix(in_oklch,var(--verdict-partner)_12%,transparent)] px-2 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-[color:var(--verdict-partner)]">
              Historical
            </span>
          );
        }
        return <span key={`${keyPrefix}-${i}`}>{part}</span>;
      });
    };

    return text.split('\n').map((line, i) => {
      if (!line.trim()) return null;

      // Check if it's a bullet point
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('- ');
      let content = line.trim().replace(/^•\s*/, '').replace(/^-\s+/, '');

      // Prettify URLs to only show domain, handling trailing punctuation
      content = content.replace(/(—\s*Source:\s*|,\s*)(https?:\/\/[^\s]+)/gi, (match, prefix, url) => {
        try {
          const cleanUrl = url.replace(/[.,;)]+$/, '');
          const domain = new URL(cleanUrl).hostname.replace('www.', '');
          const suffix = url.slice(cleanUrl.length); // keep trailing punctuation
          return `${prefix}${domain}${suffix}`;
        } catch {
          return match;
        }
      });

      return (
        <div key={i} className={`flex items-start gap-1.5 text-sm leading-relaxed ${isBullet ? 'text-foreground/90' : 'text-foreground/75'}`}>
          {isBullet && <Dot className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />}
          <span className="flex-1 min-w-0 break-words [word-break:break-word]">{renderWithHistorical(content, `line-${i}`)}</span>
        </div>
      );
    });
  };

  return (
    <GlassCard
      title={report.title}
      subtitle={data.status === 'loading' ? 'Analyzing...' : (data.status === 'idle' ? 'Awaiting Data...' : (data.status === 'error' ? 'Error' : 'Complete'))}
      headerRight={
        unverifiedCount > 0 ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-[color:color-mix(in_oklch,var(--verdict-avoid)_45%,transparent)] bg-[color:color-mix(in_oklch,var(--verdict-avoid)_14%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--verdict-avoid)]">
            <TriangleAlert className="size-3" aria-hidden="true" />
            {unverifiedCount} Unverified {unverifiedCount === 1 ? "Citation" : "Citations"}
          </span>
        ) : undefined
      }
    >
      {/* Metadata badges */}
      {data.status === 'complete' && (data.confidence != null || data.evidenceQuality != null) && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          {data.confidence != null && (
            <span>🎯 Confidence: <strong className="text-foreground">{data.confidence}/10</strong></span>
          )}
          {data.evidenceQuality != null && (
            <div className="group relative flex items-center cursor-help">
              <span>📊 Evidence Quality: <strong className="text-foreground">{data.evidenceQuality}/10</strong></span>
              {data.freshnessAdjusted && (
                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-500/80 font-semibold border border-amber-500/30 bg-amber-500/10 px-1.5 py-px rounded">Freshness-Adjusted</span>
              )}
              {data.evidenceReceipt && (
                <div className="absolute left-0 top-full mt-2 hidden w-64 z-50 group-hover:block rounded-lg border border-border bg-card p-3 shadow-xl text-xs text-muted-foreground animate-in fade-in zoom-in-95">
                  <div className="font-semibold text-foreground mb-2">Evidence Breakdown</div>
                  <div className="grid grid-cols-[1fr_auto] gap-y-1 gap-x-4">
                    {data.evidenceReceipt.tier_1?.count > 0 && (
                      <><span>Tier 1 ({data.evidenceReceipt.tier_1.count})</span><span className="text-right text-foreground">+{data.evidenceReceipt.tier_1.count * data.evidenceReceipt.tier_1.weight}</span></>
                    )}
                    {data.evidenceReceipt.tier_2?.count > 0 && (
                      <><span>Tier 2 ({data.evidenceReceipt.tier_2.count})</span><span className="text-right text-foreground">+{data.evidenceReceipt.tier_2.count * data.evidenceReceipt.tier_2.weight}</span></>
                    )}
                    {data.evidenceReceipt.tier_3?.count > 0 && (
                      <><span>Tier 3 ({data.evidenceReceipt.tier_3.count})</span><span className="text-right text-foreground">+{data.evidenceReceipt.tier_3.count * data.evidenceReceipt.tier_3.weight}</span></>
                    )}
                    {data.evidenceReceipt.tier_4?.count > 0 && (
                      <><span>Tier 4 ({data.evidenceReceipt.tier_4.count})</span><span className="text-right text-foreground">+{data.evidenceReceipt.tier_4.count * data.evidenceReceipt.tier_4.weight}</span></>
                    )}
                    {data.evidenceReceipt.count_bonus > 0 && (
                      <><span>Volume Bonus</span><span className="text-right text-foreground">+{data.evidenceReceipt.count_bonus}</span></>
                    )}
                    {data.evidenceReceipt.freshness_multiplier < 1.0 && (
                      <><span>Time Decay Penalty</span><span className="text-right text-red-400">x{data.evidenceReceipt.freshness_multiplier}</span></>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-foreground">
                    <span>Final Score</span>
                    <span>{data.evidenceReceipt.final_score}/10</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Missing information warning */}
      {data.status === 'complete' && data.missingInformation && (
        <div className="rounded-lg border-l-[3px] border-l-amber-500 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 break-words [word-break:break-word] whitespace-pre-wrap">
          <strong>Missing:</strong> {data.missingInformation}
        </div>
      )}

      {/* Internal conflicts warning */}
      {data.status === 'complete' && data.internalConflicts && (
        <div className="rounded-lg border-l-[3px] border-l-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-300 break-words [word-break:break-word] whitespace-pre-wrap">
          <strong>⚠ Internal conflict:</strong> {data.internalConflicts}
        </div>
      )}

      {/* Loading skeleton */}
      {data.status === 'loading' && (
        <div className="flex flex-col gap-3">
          {[100, 90, 95, 80, 85].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-secondary" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Main output */}
      {data.status === 'complete' && (
        <div className="flex flex-col gap-2">
          {renderOutput(output)}
        </div>
      )}

      {/* Sources */}
      {data.status === 'complete' && data.sources && data.sources.length > 0 && (
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Sources ({data.sources.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5 pl-4 text-xs">
            {data.sources.map((url: string, idx: number) => (
              <li key={idx}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </GlassCard>
  )
}
