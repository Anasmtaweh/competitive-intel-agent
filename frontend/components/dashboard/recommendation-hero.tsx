import { EmphasisText } from "./emphasis-text"

function ConfidenceMeter({ value, color }: { value: number; color: string }) {
  const pct = (value / 10) * 100
  const r = 52
  const circumference = 2 * Math.PI * r

  return (
    <div className="relative flex size-32 items-center justify-center" role="img" aria-label={`Confidence ${value} out of 10`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--secondary)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading text-3xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">/ 10</span>
      </div>
    </div>
  )
}

const tldrSections = [
  { heading: "Key Decision Drivers", key: "key_decision_drivers" },
  { heading: "Strongest Supporting Evidence", key: "strongest_supporting_evidence" },
  { heading: "Core Trade-off", key: "trade_off" },
  { heading: "Reasoning", key: "reasoning" },
] as const

const verdictColors: Record<string, string> = {
  INVEST: 'var(--verdict-invest)',
  PARTNER: 'var(--verdict-partner)',
  AVOID: 'var(--verdict-avoid)',
  WATCH: 'var(--verdict-watch)',
}

export function RecommendationHero({ verdictData }: { verdictData: any }) {
  const color = verdictColors[verdictData.verdict?.toUpperCase()] || 'var(--muted-foreground)'

  return (
    <section
      aria-labelledby="final-recommendation"
      className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-xl lg:grid-cols-[320px_1fr]"
    >
      {/* Left panel: the verdict */}
      <div className="flex flex-col items-center justify-center gap-8 border-b border-border p-10 lg:border-b-0 lg:border-r">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Final Recommendation
          </span>
        </div>

        <span
          className="rounded-xl px-8 py-3 font-heading text-3xl font-bold tracking-wide"
          style={{
            color,
            backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
            border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
            boxShadow: `0 0 40px -8px color-mix(in oklch, ${color} 60%, transparent)`,
          }}
        >
          {verdictData.verdict || 'AWAITING...'}
        </span>

        <div className="flex flex-col items-center gap-2">
          <ConfidenceMeter value={verdictData.confidence || 0} color={color} />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</span>
        </div>

        {verdictData.stability && (
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Stability</span>
            <div className="flex items-center gap-2 group relative cursor-help">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                verdictData.stability === 'HIGH' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                verdictData.stability === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {verdictData.stability}
              </span>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden w-56 z-50 group-hover:block rounded-lg border border-border bg-card p-3 shadow-xl text-xs text-muted-foreground animate-in fade-in zoom-in-95 text-center leading-relaxed">
                {verdictData.stability_reason}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: the TL;DR */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 p-8 md:grid-cols-2 md:p-10">
        {tldrSections.map(({ heading, key }) => {
          if (!verdictData[key]) return null;
          return (
            <div key={key} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color }}>
                {heading}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <EmphasisText text={verdictData[key]} />
              </p>
            </div>
          )
        })}
      </div>

      {/* Sensitivity & Gaps */}
      {verdictData.status === 'complete' && (
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border bg-secondary/10">
          
          {/* Sensitivity */}
          <div className="p-8 md:p-10 flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color }}>Decision Sensitivity</h3>
            <div className="flex flex-col gap-4">
              {verdictData.what_would_flip_to_invest && verdictData.what_would_flip_to_invest !== 'N/A' && (
                <div className="text-sm">
                  <span className="font-semibold text-[color:var(--verdict-invest)] text-xs uppercase tracking-widest">Flip to Invest if:</span>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed"><EmphasisText text={verdictData.what_would_flip_to_invest} /></p>
                </div>
              )}
              {verdictData.what_would_flip_to_avoid && verdictData.what_would_flip_to_avoid !== 'N/A' && (
                <div className="text-sm">
                  <span className="font-semibold text-[color:var(--verdict-avoid)] text-xs uppercase tracking-widest">Flip to Avoid if:</span>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed"><EmphasisText text={verdictData.what_would_flip_to_avoid} /></p>
                </div>
              )}
            </div>
          </div>

          {/* Intelligence Gaps */}
          <div className="p-8 md:p-10 flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">Intelligence Gaps</h3>
            {verdictData.intelligence_gaps?.length > 0 ? (
              <ul className="flex flex-col gap-5">
                {verdictData.intelligence_gaps.map((gap: any, i: number) => (
                  <li key={i} className="text-sm flex flex-col gap-1.5">
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        ~+{gap.impact} Confidence
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed"><EmphasisText text={gap.description} /></p>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-muted-foreground">No significant intelligence gaps identified.</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
