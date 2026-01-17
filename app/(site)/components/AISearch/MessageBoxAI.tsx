import { TAIChatMessage } from "@/TS/types/TAIChatMessage"
import Image from "next/image"

export function MessageBoxAI({ role, text, imageUrl }: TAIChatMessage) {
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
        {imageUrl && <Image src={imageUrl} alt="generated-image" width={400} height={200} />}
      </div>
    </div>
  )
}
