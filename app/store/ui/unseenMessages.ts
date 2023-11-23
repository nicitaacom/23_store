import { create } from "zustand"

type UnseenMessagesStore = {
  unreadMessages: Record<string, number>
  setUnreadMessages: (unseenMessages: { ticket_id: string; amount_unseen: number }[]) => void
  resetUnreadMessages: (ticketId: string) => void
  increaseUnreadMessages: (ticketId: string) => void
}

export const useUnseenMessages = create<UnseenMessagesStore>()(set => ({
  unreadMessages: {},
  setUnreadMessages: unseenMessages => {
    const unreadMessagesMap: Record<string, number> = {}
    unseenMessages.forEach(({ ticket_id, amount_unseen }) => {
      unreadMessagesMap[ticket_id] = amount_unseen
    })
    set({ unreadMessages: unreadMessagesMap })
  },
  resetUnreadMessages: ticketId => {
    set(state => ({
      unreadMessages: {
        ...state.unreadMessages,
        [ticketId]: 0,
      },
    }))
  },
  increaseUnreadMessages: ticketId => {
    set(state => ({
      unreadMessages: {
        ...state.unreadMessages,
        [ticketId]: (state.unreadMessages[ticketId] || 0) + 1,
      },
    }))
  },
}))
