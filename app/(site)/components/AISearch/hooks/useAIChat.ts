import { useRef, useEffect } from "react"
import { useAIChatStore } from "@/components/Navbar/stores/useAIChat"
import { useLoading } from "@/store/ui/useLoading"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { handleAIFunctionCall } from "../utils/aiFunctionHandlers"
import axios from "axios"
import { uploadImageFn } from "@/functions/uploadImageFn"

type ChatMessage = { role: "user" | "ai"; text: string }

export function useAIChat() {
  const { promptValue, setPromptValue, conversation, setConversation, memory, setMemory } = useAIChatStore()
  const { isLoading, setIsLoading } = useLoading()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rateLimitSDK = new RateLimitSDK()

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [conversation])

  useEffect(() => {
    if (!isLoading && inputRef.current) inputRef.current.focus()
  }, [isLoading])

  const handleSubmit = async () => {
    if (!promptValue.trim() || isLoading) return

    await rateLimitSDK.rateLimit("aiPrompt")

    const userMessage = promptValue.trim()
    const newConversation: ChatMessage[] = [...conversation, { role: "user", text: userMessage }]
    setConversation(newConversation)
    setPromptValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptValue: userMessage,
          memory,
          conversationHistory: conversation,
        }),
      })

      if (!response.ok) {
        setConversation([...newConversation, { role: "ai", text: "Service error. Try again." }])
        return
      }

      const data = await response.json()
      const functionCall = data?.openai?.choices?.[0]?.message?.function_call

      if (functionCall?.name) {
        const functionArgs = (() => {
          try {
            return JSON.parse(functionCall.arguments || "{}")
          } catch {
            return {}
          }
        })()

        const functionResult = await handleAIFunctionCall(functionCall.name, functionArgs)

        if (functionResult.success) {
          setConversation([...newConversation, { role: "ai", text: functionResult.message }])
          if (functionResult.memory) setMemory(functionResult.memory)
          else if (data?.memory) setMemory(data.memory)
          return
        }

        setConversation([...newConversation, { role: "ai", text: functionResult.message }])
        return
      }

      const aiReply =
        data?.openai?.choices?.[0]?.message?.content ||
        data?.reply ||
        "It's no choices?.[0]?.message?.content - contact support"
      setConversation([...newConversation, { role: "ai", text: aiReply }])

      if (data?.memory) setMemory(data.memory)
    } catch (error) {
      console.error("AI Chat Error:", error)
      setConversation([...newConversation, { role: "ai", text: "Oops, something went wrong. Try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  const generateImage = async () => {
    if (isLoading) return

    setIsLoading(true)

    await rateLimitSDK.rateLimit("aiGenerateImage")

    try {
      const imageResponse = await axios.post(
        "/api/ai/generate-image",
        { prompt: `${memory} - generate image for this product` } as API.GenerateImageRequest,
        { responseType: "arraybuffer" },
      )

      if (imageResponse.status !== 200) {
        throw new Error(`Image generation failed with status ${imageResponse.status}`)
      }

      const imageFile = new File([imageResponse.data], "generated_image.png", { type: "image/png" })

      const uploadResult = await uploadImageFn({ imageFile, bucket: "public-images" })
      if (typeof uploadResult === "string") {
        throw new Error(`Image upload failed: ${uploadResult}`)
      }

      setConversation([
        ...conversation,
        { role: "user", text: `Generate image: ${promptValue}` },
        // TODO - add more variations e.g here is your generated image
        { role: "ai", text: "Here you go", imageUrl: uploadResult.publicUrl },
      ])
      setPromptValue("")
    } catch (error) {
      console.error("Image generation error:", error)
      setConversation([...conversation, { role: "ai", text: "Image generation error. Try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.target as HTMLTextAreaElement
    target.style.height = "auto"
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
  }

  return {
    promptValue,
    setPromptValue,
    conversation,
    memory,
    isLoading,
    chatEndRef,
    inputRef,
    handleSubmit,
    generateImage,
    handleKeyPress,
    handleTextareaInput,
  }
}
