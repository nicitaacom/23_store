import { create } from "zustand"

import { TMessageDB } from "@/ts/support/TMessageDB"
import { getAnonymousId } from "@/functions/getAnonymousId"
import { getUserId } from "@/utils/getUserId"
import selectTicketId from "@/actions/selectTicketId"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import useUser from "@/store/user/useUser"

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

export const useMessages = create<MessagesStore>()((set, get) => ({
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
    const hasPreviousIdentity = Boolean(useUser.getState().user?.id || getAnonymousId())
    const userId = getUserId()
    if (!hasPreviousIdentity) {
      set(() => ({
        messages: [],
        unseenMessagesNumber: 0,
        ticketId: null,
      }))
      return
    }

    const getMessagesResp = await supportSDK.getMessages({ userId })
    const unseenAmount = getMessagesResp.filter(message => !message.seen && message.sender_id !== userId).length

    let ticketIdLet: string | null = null
    if (!state.ticketId) {
      const selectTicketIdResp = await selectTicketId()
      if (!selectTicketIdResp) return
      else ticketIdLet = selectTicketIdResp
    }

    set(() => ({
      unseenMessagesNumber: unseenAmount,
      messages: getMessagesResp,
      ticketId: ticketIdLet,
    }))
  },
}))
