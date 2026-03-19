import { useRef, useEffect } from "react"
import axios from "axios"

import { useAIChatStore } from "@/components/Navbar/stores/useAIChat"
import { useLoading } from "@/store/ui/useLoading"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { handleAIFunctionCall } from "../utils/aiFunctionHandlers"
import { uploadImageFn } from "@/functions/uploadImageFn"
import { useI18n } from "@/locales/client"
import { useToast } from "@/store/ui"
import type { TAIChatMessage } from "@/ts/types/TAIChatMessage"
import useUserStore from "@/store/user/userStore"
import { usePathname, useRouter } from "next/navigation"

export function useAIChat() {
  const router = useRouter()
  const pathname = usePathname()
  const userId = useUserStore(state => state.user?.id ?? "")

  const toast = useToast()
  const {
    promptValue,
    setPromptValue,
    conversation,
    setConversation,
    memory,
    setMemory,
    debugContext,
    setDebugContext,
    ownerId,
    setOwnerId,
    resetChat,
  } = useAIChatStore()
  const { isLoading, setIsLoading } = useLoading()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rateLimitSDK = new RateLimitSDK()
  const t = useI18n()

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [conversation])

  useEffect(() => {
    if (!isLoading && inputRef.current) inputRef.current.focus()
  }, [isLoading])

  useEffect(() => {
    if (ownerId && ownerId !== userId) resetChat()
    if (ownerId !== userId) setOwnerId(userId)
  }, [ownerId, resetChat, setOwnerId, userId])

  const syncFunctionTurnMemory = async (userPrompt: string, assistantReply: string, baseMemory: string) => {
    try {
      const response = await fetch("/api/ai/sales-assistant/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt,
          assistantReply,
          memory: baseMemory,
        } as API.AISalesAssistantMemoryRequest),
      })

      if (!response.ok) return null

      const data = (await response.json()) as API.AISalesAssistantMemoryResponse
      return data?.memory || null
    } catch (error) {
      console.error("Failed to sync AI function-call memory.", error)
      return null
    }
  }

  const handleSubmit = async (prompt?: string) => {
    if ((!prompt && !promptValue.trim()) || isLoading) return

    const { user } = useUserStore.getState()
    if (!user?.id) {
      toast.show("warning", t("toast.please_login_title"), t("toast.please_login_subtitle"))
      router.push(pathname + (pathname?.includes("?") ? "&" : "?") + "modal=" + "AuthModal&variant=login")
      return
    }

    const userMessage = prompt || promptValue.trim()
    const newConversation: TAIChatMessage[] = [...conversation, { role: "user", text: userMessage }]
    setConversation(newConversation)
    setPromptValue("")
    setIsLoading(true)

    try {
      await rateLimitSDK.rateLimit(t, "aiPrompt")

      const response = await fetch("/api/ai/sales-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptValue: userMessage,
          memory,
          conversationHistory: newConversation,
        }),
      })

      if (!response.ok) {
        setConversation([...newConversation, { role: "ai", text: t("aichat.error") }])
        return
      }

      const data = await response.json()
      if (data?.debug) setDebugContext(data.debug)
      const functionCall = data?.openai?.choices?.[0]?.message?.function_call

      if (functionCall?.name) {
        const functionArgs = (() => {
          try {
            return JSON.parse(functionCall.arguments || "{}")
          } catch {
            return {}
          }
        })()

        const functionResult = await handleAIFunctionCall(functionCall.name, { ...functionArgs, t })

        if (functionResult.success) {
          const aiMessage: TAIChatMessage =
            functionCall.name === "generateImage" && functionResult.data?.imageUrl
              ? {
                  role: "ai",
                  text: functionResult.message,
                  imageUrl: String(functionResult.data.imageUrl),
                }
              : {
                  role: "ai",
                  text: functionResult.message,
                }

          setConversation([...newConversation, aiMessage])

          const syncedMemory = await syncFunctionTurnMemory(userMessage, aiMessage.text, data?.memory || memory)

          if (syncedMemory) setMemory(syncedMemory)
          else if (data?.memory) setMemory(data.memory)
          else if (functionResult.memory) setMemory(functionResult.memory)
          return
        }

        setConversation([...newConversation, { role: "ai", text: functionResult.message }])

        const syncedMemory = await syncFunctionTurnMemory(userMessage, functionResult.message, data?.memory || memory)

        if (syncedMemory) setMemory(syncedMemory)
        else if (data?.memory) setMemory(data.memory)
        else if (functionResult.memory) setMemory(functionResult.memory)
        return
      }

      const aiReply = data?.openai?.choices?.[0]?.message?.content || data?.reply || t("aichat.error.no_reply_data")
      setConversation([...newConversation, { role: "ai", text: aiReply }])

      if (data?.memory) setMemory(data.memory)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(t("aichat.error"), error)
      toast.show("error", t("aichat.error"), errorMessage)
      setConversation([...newConversation, { role: "ai", text: `Oops, "${errorMessage}". Try again.` }])
    } finally {
      setIsLoading(false)
    }
  }

  const generateImage = async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      await rateLimitSDK.rateLimit(t, "aiGenerateImage")

      const imageResponse = await axios.post(
        "/api/ai/generate-image",
        { prompt: `${memory} - generate image for this product` } as API.GenerateImageRequest,
        { responseType: "arraybuffer" },
      )

      if (imageResponse.status !== 200) {
        throw new Error(`Image generation failed with status ${imageResponse.status}`)
      }

      const imageFile = new File([imageResponse.data], "generated_image.png", { type: "image/png" })

      const uploadResult = await uploadImageFn({ t, imageFile, bucket: "public-images" })
      if (typeof uploadResult === "string") {
        throw new Error(`Image upload failed: ${uploadResult}`)
      }

      setConversation([
        ...conversation,
        { role: "user", text: `${t("aichat.generate_image")}: ${promptValue}` },
        // TODO - add more variations e.g here is your generated image
        { role: "ai", text: t("aichat.generate_image_completed"), imageUrl: uploadResult.publicUrl },
      ])
      setPromptValue("")
    } catch (error) {
      console.error(`${t("aichat.error.generate_image")}:`, error)
      setConversation([...conversation, { role: "ai", text: `${t("aichat.error.generate_image")}:` }])
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = async () => {
    await handleSubmit("Add to cart")
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
    debugContext,
    isLoading,
    chatEndRef,
    inputRef,
    handleSubmit,
    generateImage,
    addToCart,
    handleKeyPress,
    handleTextareaInput,
  }
}
