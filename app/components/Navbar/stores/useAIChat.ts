import { TAIChatMessage } from "@/ts/types/TAIChatMessage"
import { create } from "zustand"
import { persist, subscribeWithSelector } from "zustand/middleware"

type AIChat = {
  promptValue: string
  setPromptValue: (promptValue: string) => void

  conversation: TAIChatMessage[]
  setConversation: (conversation: TAIChatMessage[]) => void

  memory: string
  setMemory: (memory: string) => void

  debugContext: API.AISalesAssistantDebug | null
  setDebugContext: (debugContext: API.AISalesAssistantDebug | null) => void

  ownerId: string
  setOwnerId: (ownerId: string) => void

  resetChat: () => void
}

const useAIChat = (set: any): AIChat => ({
  promptValue: "",
  setPromptValue: promptValue => set(() => ({ promptValue })),

  conversation: [],
  setConversation: conversation => set(() => ({ conversation })),

  memory: "",
  setMemory: memory => set(() => ({ memory })),

  debugContext: null,
  setDebugContext: debugContext => set(() => ({ debugContext })),

  ownerId: "",
  setOwnerId: ownerId => set(() => ({ ownerId })),

  resetChat: () =>
    set(() => ({
      promptValue: "",
      conversation: [],
      memory: "",
      debugContext: null,
    })),
})

export const useAIChatStore = create(
  subscribeWithSelector(
    persist(useAIChat, {
      name: "aiStore",
      partialize: (state: AIChat) => ({ memory: state.memory, conversation: state.conversation, ownerId: state.ownerId }),
    }),
  ),
)
