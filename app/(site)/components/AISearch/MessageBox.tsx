type MessageBoxProps = {
  role: "user" | "ai"
  text: string
}

export function MessageBox({ role, text }: MessageBoxProps) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"} animate-[fadeIn_0.3s_ease-in]`}>
      <div
        className={`
          relative px-4 py-3 rounded-lg max-w-[85%] break-words
          ${role === "user" ? "bg-success" : "bg-foreground-accent border border-border-color"}
        `}>
        <p
          className={`text-[15px] leading-relaxed whitespace-pre-wrap ${role === "user" ? "text-black" : "text-title"}`}>
          {text}
        </p>
      </div>
    </div>
  )
}
