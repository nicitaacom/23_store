type TiptapMark = { type: string }
type TiptapNode = { type: string; text?: string; marks?: TiptapMark[]; content?: TiptapNode[] }

function parseLine(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  let i = 0
  let plain = ""

  const flush = () => {
    if (plain) { nodes.push({ type: "text", text: plain }); plain = "" }
  }

  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2)
      if (end !== -1) {
        flush()
        nodes.push({ type: "text", text: text.slice(i + 2, end), marks: [{ type: "bold" }] })
        i = end + 2
        continue
      }
    }
    if (text[i] === "_") {
      const end = text.indexOf("_", i + 1)
      if (end !== -1) {
        flush()
        nodes.push({ type: "text", text: text.slice(i + 1, end), marks: [{ type: "underline" }] })
        i = end + 1
        continue
      }
    }
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1)
      if (end !== -1 && text[end + 1] !== "*") {
        flush()
        nodes.push({ type: "text", text: text.slice(i + 1, end), marks: [{ type: "italic" }] })
        i = end + 1
        continue
      }
    }
    plain += text[i++]
  }
  flush()
  return nodes
}

export function markdownToTiptap(markdown: string): TiptapNode {
  const lines = (markdown || "").split("\n")
  const content: TiptapNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith("* ")) {
      const items: TiptapNode[] = []
      while (i < lines.length && lines[i].startsWith("* ")) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseLine(lines[i].slice(2)) }] })
        i++
      }
      content.push({ type: "bulletList", content: items })
    } else {
      content.push({ type: "paragraph", content: parseLine(line) })
      i++
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
