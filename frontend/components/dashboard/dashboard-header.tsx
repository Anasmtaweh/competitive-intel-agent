"use client"

import { useState } from "react"
import { Search, Radar } from "lucide-react"

export function DashboardHeader({ 
  onSearch, 
  isStreaming,
  apiKey,
  setApiKey
}: { 
  onSearch?: (q: string) => void, 
  isStreaming?: boolean,
  apiKey?: string,
  setApiKey?: (val: string) => void
}) {
  const [query, setQuery] = useState("")

  return (
    <header className="flex flex-col items-center gap-8 pb-10 pt-12">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card backdrop-blur-md">
          <Radar className="size-4 text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-2xl text-center">
          Competitive Intelligence Agent
        </h1>
      </div>

      <form
        className="flex w-full max-w-3xl items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (onSearch && !isStreaming) onSearch(query)
        }}
        role="search"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isStreaming}
            placeholder="Analyze Startup..."
            aria-label="Startup name to analyze"
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-md outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          />
        </div>
        <input
          type="text"
          value={apiKey || ""}
          onChange={(e) => setApiKey && setApiKey(e.target.value)}
          disabled={isStreaming}
          placeholder="Fireworks API Key (Required)"
          required
          className="h-12 w-64 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-md outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming}
          className="h-12 shrink-0 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-4px_var(--verdict-invest)] transition-shadow hover:shadow-[0_0_36px_-4px_var(--verdict-invest)] disabled:opacity-50"
        >
          {isStreaming ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </form>
    </header>
  )
}
