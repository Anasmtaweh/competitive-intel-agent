/**
 * Renders text where segments wrapped in **...** (monetary values, percentages)
 * are heavily bolded in bright white for executive skimming.
 */
export function EmphasisText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
