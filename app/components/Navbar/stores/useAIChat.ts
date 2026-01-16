import { TAIChatMessage } from "@/TS/types/TAIChatMessage"
import { create } from "zustand"
import { persist, subscribeWithSelector } from "zustand/middleware"

type AIChat = {
  promptValue: string
  setPromptValue: (promptValue: string) => void

  conversation: TAIChatMessage[]
  setConversation: (conversation: TAIChatMessage[]) => void

  memory: string
  setMemory: (memory: string) => void
}

const useAIChat = (set: any): AIChat => ({
  promptValue: "",
  setPromptValue: promptValue => set(() => ({ promptValue })),

  conversation: [],
  setConversation: conversation => set(() => ({ conversation })),

  memory: "",
  setMemory: memory => set(() => ({ memory })),
})

export const useAIChatStore = create(
  subscribeWithSelector(
    persist(useAIChat, {
      name: "aiStore",
      partialize: (state: AIChat) => ({ memory: state.memory, conversation: state.conversation }),
    }),
  ),
)
