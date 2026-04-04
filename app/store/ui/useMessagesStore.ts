import { create } from "zustand"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { getUserId } from "@/utils/getUserId"
import fetchTicketId from "@/actions/fetchTicketId"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

type MessagesStore = {
  messages: IMessageDB[]
  setMessages: (messages: IMessageDB[]) => void

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
  setMessages: (messages: IMessageDB[]) => set(() => ({ messages })),

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

    const response = await fetch("/api/messages/get-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId,
      } as {
        ticketId?: string
        userId?: string
      }),
    })

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response))
    }

    const messages = (await response.json()) as IMessageDB[]
    const unseenAmount = messages.filter(message => !message.seen).length

    let ticketIdLet: string | null = null
    if (!state.ticketId) {
      const ticketId = await fetchTicketId()
      if (!ticketId) return
      else ticketIdLet = ticketId
    }

    set(() => ({
      unseenMessagesNumber: unseenAmount,
      messages,
      ticketId: ticketIdLet,
    }))
  },
}))
