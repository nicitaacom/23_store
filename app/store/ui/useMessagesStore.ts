import axios from "axios"
import { create } from "zustand"

import { TAPIMessagesGetMessagesRequest, TAPIMessagesGetMessagesResponse } from "@/api/messages/get-messages/route"
import { IMessage } from "@/interfaces/support/IMessage"
import { getUserId } from "@/utils/getUserId"

type MessagesStore = {
  ticketId: string | null // by null I mean its specially set to null because no ticket in DB
  messages: IMessage[]
  unseenMessagesNumber: number
  setMessages: (messages: IMessage[]) => void
  setTicketId: (ticketId: string) => void
  increaseUnseenMessages: () => void
  clearUnseenMessages: () => void
  initialize: () => Promise<void>
}

export const useMessagesStore = create<MessagesStore>()(set => ({
  ticketId: null,
  unseenMessagesNumber: 0,
  messages: [],
  setMessages: (messages: IMessage[]) => {
    set(() => ({
      messages: messages,
    }))
  },
  setTicketId: (ticketId: string) => {
    set(() => ({
      ticketId: ticketId,
    }))
  },
  increaseUnseenMessages() {
    set(state => ({
      unseenMessagesNumber: state.unseenMessagesNumber + 1,
    }))
  },

  clearUnseenMessages() {
    set(() => ({
      unseenMessagesNumber: 0,
    }))
  },

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
