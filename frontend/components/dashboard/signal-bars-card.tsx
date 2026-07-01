import { GlassCard } from "./glass-card"

const severityStyles: Record<string, string> = {
  HIGH: "text-[color:var(--verdict-avoid)] border-[color:color-mix(in_oklch,var(--verdict-avoid)_40%,transparent)] bg-[color:color-mix(in_oklch,var(--verdict-avoid)_12%,transparent)]",
  MEDIUM:
    "text-[color:var(--verdict-partner)] border-[color:color-mix(in_oklch,var(--verdict-partner)_40%,transparent)] bg-[color:color-mix(in_oklch,var(--verdict-partner)_12%,transparent)]",
  LOW: "text-[color:var(--verdict-invest)] border-[color:color-mix(in_oklch,var(--verdict-invest)_40%,transparent)] bg-[color:color-mix(in_oklch,var(--verdict-invest)_12%,transparent)]",
}

const positiveSeverityStyles: Record<string, string> = {
  HIGH: severityStyles.LOW,
  MEDIUM: severityStyles.MEDIUM,
  LOW: severityStyles.HIGH,
}

export function SignalBarsCard({
  title,
  subtitle,
  items,
  barColor,
  positive = false,
}: {
  title: string
  subtitle: string
  items: any[]
  barColor: string
  positive?: boolean
}) {
  const badgeStyles = positive ? positiveSeverityStyles : severityStyles

  return (
    <GlassCard title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center min-h-[150px]">
          <span className="text-muted-foreground">Awaiting data...</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {items.map((item, idx) => {
            // Risks use: name, severity, risk_score, description
            // Opportunities use: name, strength, opportunity_score, description
            const label = item.name || 'Unknown';
            const rawSeverity = (item.severity || item.strength || 'MEDIUM').toUpperCase();
            const score = item.risk_score || item.opportunity_score || 50;
            const note = item.description || '';

            return (
              <li key={idx} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeStyles[rawSeverity] || badgeStyles.MEDIUM}`}
                  >
                    {rawSeverity}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: barColor }}
                  />
                </div>
                {(item.impact != null || item.likelihood != null) && (
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    {item.impact != null && <span>Impact: {item.impact}/10</span>}
                    {item.likelihood != null && <span>Likelihood: {item.likelihood}/10</span>}
                    {score != null && <span>Score: {score}/100</span>}
                  </div>
                )}
                <span className="text-xs text-muted-foreground">{note}</span>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}
