type TiptapMark = { type: string }
type TiptapNode = { type: string; text?: string; marks?: TiptapMark[]; content?: TiptapNode[] }

function parseLine(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  let charIndex = 0
  let textBuffer = ""

  const flush = () => {
    if (textBuffer) { nodes.push({ type: "text", text: textBuffer }); textBuffer = "" }
  }

  while (charIndex < text.length) {
    if (text[charIndex] === "*" && text[charIndex + 1] === "*") {
      const end = text.indexOf("**", charIndex + 2)
      if (end !== -1) {
        flush()
        nodes.push({ type: "text", text: text.slice(charIndex + 2, end), marks: [{ type: "bold" }] })
        charIndex = end + 2
        continue
      }
    }
    if (text[charIndex] === "_") {
      const end = text.indexOf("_", charIndex + 1)
      if (end !== -1) {
        flush()
        nodes.push({ type: "text", text: text.slice(charIndex + 1, end), marks: [{ type: "underline" }] })
        charIndex = end + 1
        continue
      }
    }
    if (text[charIndex] === "*" && text[charIndex + 1] !== "*") {
      const end = text.indexOf("*", charIndex + 1)
      if (end !== -1 && text[end + 1] !== "*") {
        flush()
        nodes.push({ type: "text", text: text.slice(charIndex + 1, end), marks: [{ type: "italic" }] })
        charIndex = end + 1
        continue
      }
    }
    textBuffer += text[charIndex++]
  }
  flush()
  return nodes
}

export function markdownToTiptap(markdown: string): TiptapNode {
  const lines = (markdown || "").split("\n")
  const content: TiptapNode[] = []
  let lineIndex = 0

  while (lineIndex < lines.length) {
    const line = lines[lineIndex]
    if (line.startsWith("* ")) {
      const items: TiptapNode[] = []
      while (lineIndex < lines.length && lines[lineIndex].startsWith("* ")) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseLine(lines[lineIndex].slice(2)) }] })
        lineIndex++
      }
      content.push({ type: "bulletList", content: items })
    } else {
      content.push({ type: "paragraph", content: parseLine(line) })
      lineIndex++
    }
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [{ type: "text", text: "" }] }] }
}

function nodeToMarkdown(node: TiptapNode): string {
  if (node.type === "text") {
    let text = node.text ?? ""
    const marks = node.marks ?? []
    for (const mark of marks) {
      if (mark.type === "bold") text = `**${text}**`
      else if (mark.type === "italic") text = `*${text}*`
      else if (mark.type === "underline") text = `_${text}_`
    }
    return text
  }
  if (node.type === "hardBreak") return "\n"
  return (node.content ?? []).map(nodeToMarkdown).join("")
}

export function tiptapToMarkdown(doc: TiptapNode): string {
  const lines: string[] = []

  for (const node of doc.content ?? []) {
    if (node.type === "bulletList") {
      for (const item of node.content ?? []) {
        const text = (item.content ?? []).map(nodeToMarkdown).join("")
        lines.push(`* ${text}`)
      }
    } else {
      lines.push(nodeToMarkdown(node))
    }
  }

  return lines.join("\n")
}
