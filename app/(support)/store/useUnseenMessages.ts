import { create } from "zustand"

type UnreadMessagesStore = {
  unreadMessages: Record<string, number> // string its ticketId and number its number of unread messages
  setUnreadMessages: (unseenMessages: { ticket_id: string; amount_unseen: number }[]) => void
  resetUnreadMessages: (ticketId: string) => void
  increaseUnreadMessages: (ticketId: string) => void
}

export const useUnseenMessages = create<UnreadMessagesStore>()(set => ({
  unreadMessages: {},
  setUnreadMessages: unreadMessages => {
    const unreadMessagesMap: Record<string, number> = {}
    unreadMessages.forEach(({ ticket_id, amount_unseen }) => {
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
