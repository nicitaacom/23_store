import React from "react"

// http://localhost:6006/?path=/story/ui-inputs-messageinput--message
export function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <span className="flex flex-col gap-1">
      {lines.map((line, lineIndex) => {
        const isBullet = line.startsWith("* ")
        const parts: React.ReactNode[] = []
        let rest = isBullet ? line.slice(2) : line
        let key = 0
        while (rest.length) {
          const bold = rest.match(/\*\*(.+?)\*\*/)
          const italic = rest.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
          const underline = rest.match(/_(.+?)_/)
          const first = [bold, italic, underline]
            .filter(Boolean)
            .sort((matchA, matchB) => {
              const idxDiff = (matchA!.index ?? 0) - (matchB!.index ?? 0)
              if (idxDiff !== 0) return idxDiff
              return matchB![0].length - matchA![0].length
            })[0]
          if (!first) { parts.push(rest); break }
          if (first.index! > 0) parts.push(rest.slice(0, first.index))
          if (first === bold) parts.push(<strong className="font-semibold text-title" key={key++}>{first[1]}</strong>)
          else if (first === italic) parts.push(<em className="italic" key={key++}>{first[1]}</em>)
          else parts.push(<u key={key++}>{first[1]}</u>)
          rest = rest.slice(first.index! + first[0].length)
        }
        return <span key={lineIndex}>{isBullet ? <>• {parts}</> : parts}</span>
      })}
    </span>
  )
}
