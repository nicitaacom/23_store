import { create } from "zustand"

import { TMessageDB } from "@/ts/support/TMessageDB"
import fetchTicketId from "@/actions/fetchTicketId"
import { getUserId } from "@/utils/getUserId"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"

type MessagesStore = {
  messages: TMessageDB[]
  setMessages: (messages: TMessageDB[]) => void

  messageBodyValue: string
  setMessageBodyValue: (messageBody: string) => void

  image: File | null
  setImage: (image: File | null) => void

  ticketId: string | null // by null I mean its specially set to null because no ticket in DB
  setTicketId: (ticketId: string) => void

  unseenMessagesNumber: number
  increaseUnseenMessages: () => void
  clearUnseenMessages: () => void

  initialize: () => Promise<void>
}

export const useMessagesStore = create<MessagesStore>()((set, get) => ({
  messages: [],
  setMessages: (messages: TMessageDB[]) => set(() => ({ messages })),

  messageBodyValue: "",
  setMessageBodyValue: messageBody => set(() => ({ messageBodyValue: messageBody })),

  image: null,
  setImage: (image: File | null) => set(() => ({ image: image })),

  ticketId: null,
  unseenMessagesNumber: 0,

  setTicketId: (ticketId: string) => set(() => ({ ticketId: ticketId })),

  increaseUnseenMessages: () => set(state => ({ unseenMessagesNumber: state.unseenMessagesNumber + 1 })),

  clearUnseenMessages: () => set(() => ({ unseenMessagesNumber: 0 })),

  async initialize() {
    if (typeof window === "undefined") {
      return
    }

    const state = get()
    const userId = getUserId()
    // get userId based on authenticaed user on not
    if (!userId) {
      set(() => ({
        unseenMessagesNumber: 0,
      }))
      return
    }

    const getMessagesResp = await supportSDK.getMessages({ userId })
    const unseenAmount = getMessagesResp.filter(message => !message.seen && message.sender_id !== userId).length

    let ticketIdLet: string | null = null
    if (!state.ticketId) {
      const fetchTicketIdResp = await fetchTicketId()
      if (!fetchTicketIdResp) return
      else ticketIdLet = fetchTicketIdResp
    }

    set(() => ({
      unseenMessagesNumber: unseenAmount,
      messages: getMessagesResp,
      ticketId: ticketIdLet,
    }))
  },
}))
