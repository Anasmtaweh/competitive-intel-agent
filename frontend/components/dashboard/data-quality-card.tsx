"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { GlassCard } from "./glass-card"

export function DataQualityCard({ agents }: { agents: any }) {
  // Compute totals
  let totalTier1 = 0;
  let totalTier2 = 0;
  let totalTier3 = 0;
  let totalTier4 = 0;

  ['news', 'competitor', 'business_model', 'risk', 'opportunity'].forEach((name) => {
    const agent = agents[name];
    if (agent && agent.sourceQuality) {
      totalTier1 += agent.sourceQuality.tier_1 || 0;
      totalTier2 += agent.sourceQuality.tier_2 || 0;
      totalTier3 += agent.sourceQuality.tier_3 || 0;
      totalTier4 += agent.sourceQuality.tier_4 || 0;
    }
  });

  const sourceTiers = [
    { name: "tier1", label: "Tier 1 (Highest)", value: totalTier1, color: "var(--verdict-invest)" },
    { name: "tier2", label: "Tier 2", value: totalTier2, color: "var(--chart-5)" },
    { name: "tier3", label: "Tier 3", value: totalTier3, color: "var(--verdict-partner)" },
    { name: "tier4", label: "Tier 4 (Lowest)", value: totalTier4, color: "var(--verdict-avoid)" },
  ]

  const total = sourceTiers.reduce((sum, t) => sum + t.value, 0)
  const tier1Pct = total > 0 ? Math.round((sourceTiers[0].value / total) * 100) : 0;

  return (
    <GlassCard title="Data Quality" subtitle="Source trust-tier breakdown">
      <div className="relative mx-auto h-44 w-44">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sourceTiers}
                dataKey="value"
                nameKey="label"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={3}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {sourceTiers.map((tier) => (
                  <Cell key={tier.name} fill={tier.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-muted-foreground">Awaiting data...</span>
          </div>
        )}
        
        {total > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-2xl font-bold text-foreground">{tier1Pct}%</span>
            <span className="text-[11px] text-muted-foreground">Tier 1</span>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {sourceTiers.map((tier) => (
          <li key={tier.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2.5 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tier.color }}
                aria-hidden="true"
              />
              {tier.label}
            </span>
            <span className="font-mono text-xs font-medium text-foreground">{tier.value}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
