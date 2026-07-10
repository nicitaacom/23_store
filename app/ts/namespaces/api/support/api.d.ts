// DO NOT import anything here

declare namespace API {
  type SupportMessage = {
    id: string
    created_at: string
    seen: boolean
    body: string
    images: string[] | null
    sender_id: string
    sender_avatar_url: string | null
    sender_username: string
    ticket_id: string
  }

  type SupportStatusResponse = {
    status?: number
    message?: string
    error?: string
  }

  type SupportSendMessageRequest = {
    id?: string
    ticketId: string
    senderId: string
    senderUsername: string
    senderAvatarUrl: string | null
    messageBody: string
    images?: string[]
    messageSender: "support" | "user"
  }

  type SupportMarkMessagesAsSeenRequest = {
    messages: SupportMessage[]
    ticketId: string
    userId: string
  }

  type SupportGetMessagesRequest = {
    ticketId?: string
    userId?: string
  }

  type SupportOpenTicketRequest = {
    ticketId: string
    ownerId: string
    ownerUsername: string
    ownerAvatarUrl: string | null
    messageBody: string
  }

  type SupportCloseTicketRequest = {
    ticketId: string
    closedBy: "user" | "support"
  }

  type SupportCloseTicketResponse = {
    message: string
  }

  type SupportRateTicketRequest = {
    ticketId: string | null
    rate: number | null
  }

  type SupportGetTicketIdRequest = {
    userId: string
  }

  type SupportGetTicketIdResponse = {
    ticket_id?: string
  }
}
