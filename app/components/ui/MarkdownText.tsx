import React from "react"

export function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <span className="space-y-1">
      {lines.map((line, i) => {
        const isBullet = line.startsWith("* ")
        const parts: React.ReactNode[] = []
        let rest = isBullet ? line.slice(2) : line
        let key = 0
        while (rest.length) {
          const bold = rest.match(/\*\*(.+?)\*\*/)
          const italic = rest.match(/\*(.+?)\*/)
          const underline = rest.match(/_(.+?)_/)
          const first = [bold, italic, underline]
            .filter(Boolean)
            .sort((a, b) => {
              const idxDiff = (a!.index ?? 0) - (b!.index ?? 0)
              if (idxDiff !== 0) return idxDiff
              return b![0].length - a![0].length // longer match wins on tie (** beats *)
            })[0]
          if (!first) { parts.push(rest); break }
          if (first.index! > 0) parts.push(rest.slice(0, first.index))
          if (first === bold) parts.push(<strong key={key++} className="font-semibold text-title">{first[1]}</strong>)
          else if (first === italic) parts.push(<em key={key++} className="italic">{first[1]}</em>)
          else parts.push(<u key={key++}>{first[1]}</u>)
          rest = rest.slice(first.index! + first[0].length)
        }
        return <span key={i} className="block">{isBullet ? <>• {parts}</> : parts}</span>
      })}
    </span>
  )
}
