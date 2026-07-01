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
      const content = line.trim().replace(/^•\s*/, '').replace(/^-\s+/, '');

      return (
        <div key={i} className={`flex items-start gap-1.5 text-sm leading-relaxed ${isBullet ? 'text-foreground/85' : 'text-muted-foreground'}`}>
          {isBullet && <Dot className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />}
          <span>{renderWithHistorical(content, `line-${i}`)}</span>
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
            <span>📊 Evidence Quality: <strong className="text-foreground">{data.evidenceQuality}/10</strong></span>
          )}
        </div>
      )}

      {/* Missing information warning */}
      {data.status === 'complete' && data.missingInformation && (
        <div className="rounded-lg border-l-[3px] border-l-amber-500 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <strong>Missing:</strong> {data.missingInformation}
        </div>
      )}

      {/* Internal conflicts warning */}
      {data.status === 'complete' && data.internalConflicts && (
        <div className="rounded-lg border-l-[3px] border-l-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-300">
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
