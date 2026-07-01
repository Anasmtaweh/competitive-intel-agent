import type { ReactNode } from "react"

export function GlassCard({
  title,
  subtitle,
  children,
  headerRight,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  headerRight?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-7 backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {headerRight}
      </header>
      {children}
    </section>
  )
}
