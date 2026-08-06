import { useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import type { TAIChatMessage } from "@/ts/types/TAIChatMessage"
import { handleAIFunctionCall } from "../utils/aiFunctionHandlers"
import { aiSDK } from "@/sdk/AISDK/AISDK"
import { getAiImageFolder } from "@/functions/uploadImageFolder"
import { getTimestampFileName } from "@/functions/support/image/getTimestampFileName"
import { uploadImageFn } from "@/functions/uploadImageFn"
import { useAIChatStore } from "@/components/Navbar/stores/useAIChatStore"
import { useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import { useToast } from "@/store/ui"
import useUser from "@/store/user/useUser"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

export function useAIChat() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const userId = user?.id ?? ""

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
      const response = await aiSDK.syncSalesAssistantMemory({
        userPrompt,
        assistantReply,
        memory: baseMemory,
      })
      return response?.memory || null
    } catch (error) {
      console.error("Failed to sync AI function-call memory.", error)
      return null
    }
  }

  /**
   * The AI shopping assistant is behind a sign-in, both ways in: the prompt box and the generate
   * image button. Every image it writes therefore belongs to an account, which is what lets
   * 23_ai-product-images be foldered by the owner's email with no guest folder at all.
   */
  const isSignedIn = () => {
    if (useUser.getState().user?.id) return true

    toast.show("warning", t("toast.please_login_title"), t("toast.please_login_subtitle"))
    router.push(pathname + (pathname?.includes("?") ? "&" : "?") + "modal=" + "AuthModal&variant=login")
    return false
  }

  const handleSubmit = async (prompt?: string) => {
    if ((!prompt && !promptValue.trim()) || isLoading) return
    if (!isSignedIn()) return

    const userMessage = prompt || promptValue.trim()
    const newConversation: TAIChatMessage[] = [...conversation, { role: "user", text: userMessage }]
    setConversation(newConversation)
    setPromptValue("")
    setIsLoading(true)

    try {
      await rateLimitSDK.rateLimit(t, "aiPrompt")

      const response = await aiSDK.chatWithSalesAssistant({
        promptValue: userMessage,
        memory,
        conversationHistory: newConversation,
      })
      if (response?.debug) setDebugContext(response.debug)
      const openAIMessage = (
        response?.openai as
          | {
              choices?: Array<{
                message?: {
                  content?: string
                  function_call?: {
                    name?: string
                    arguments?: string
                  }
                }
              }>
            }
          | undefined
      )?.choices?.[0]?.message
      const functionCall = openAIMessage?.function_call

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

          const syncedMemory = await syncFunctionTurnMemory(userMessage, aiMessage.text, response?.memory || memory)

          if (syncedMemory) setMemory(syncedMemory)
          else if (response?.memory) setMemory(response.memory)
          else if (functionResult.memory) setMemory(functionResult.memory)
          return
        }

        setConversation([...newConversation, { role: "ai", text: functionResult.message }])

        const syncedMemory = await syncFunctionTurnMemory(userMessage, functionResult.message, response?.memory || memory)

        if (syncedMemory) setMemory(syncedMemory)
        else if (response?.memory) setMemory(response.memory)
        else if (functionResult.memory) setMemory(functionResult.memory)
        return
      }

      const aiReply = openAIMessage?.content || t("aichat.error.no_reply_data")
      setConversation([...newConversation, { role: "ai", text: aiReply }])

      if (response?.memory) setMemory(response.memory)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(t("aichat.error"), error)
      toast.show("error", t("aichat.error"), errorMessage)
      setConversation([...newConversation, { role: "ai", text: t("aichat.error.with_reason", { message: errorMessage }) }])
    } finally {
      setIsLoading(false)
    }
  }

  const generateImage = async () => {
    if (isLoading) return
    if (!isSignedIn()) return

    setIsLoading(true)

    try {
      await rateLimitSDK.rateLimit(t, "aiGenerateImage")

      const generatedImage = await aiSDK.generateImageBuffer(`${memory} - generate image for this product`)

      // The assistant hands back bytes and a content type, no name - so the name is the moment it
      // arrived, the same rule a pasted chat image follows.
      const generatedImageName = getTimestampFileName(generatedImage.contentType.replace("/", "."))
      const imageFile = new File([generatedImage.buffer], generatedImageName, {
        type: generatedImage.contentType,
      })

      const aiImageFolder = getAiImageFolder()
      if (!aiImageFolder) throw new Error(t("toast.please_login_title"))

      const response = await uploadImageFn({ t, imageFile, bucket: "23_ai-product-images", folder: aiImageFolder })
      if (typeof response === "string") {
        throw new Error(`Image upload failed: ${response}`)
      }

      setConversation([
        ...conversation,
        { role: "user", text: `${t("aichat.generate_image")}: ${promptValue}` },
        // TODO - add more variations e.g here is your generated image
        { role: "ai", text: t("aichat.generate_image_completed"), imageUrl: response.publicUrl },
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
