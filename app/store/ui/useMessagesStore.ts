import axios from "axios"
import { create } from "zustand"

import { TAPIMessagesGetMessagesRequest, TAPIMessagesGetMessagesResponse } from "@/api/messages/get-messages/route"
import { IMessageDB } from "@/TS/support/IMessage"
import { getUserId } from "@/utils/getUserId"

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

export const useMessagesStore = create<MessagesStore>()(set => ({
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
    const userId = getUserId()
    // get userId based on authenticaed user on not
    if (!userId) {
      set(() => ({
        unseenMessagesNumber: 0,
      }))
      return
    }

    const response: TAPIMessagesGetMessagesResponse = await axios.post("/api/messages/get-messages", {
      userId: userId,
    } as TAPIMessagesGetMessagesRequest)

    const unseenAmount = response.data.filter(message => !message.seen).length

    set(() => ({
      unseenMessagesNumber: unseenAmount,
      messages: response.data,
    }))
  },
}))
