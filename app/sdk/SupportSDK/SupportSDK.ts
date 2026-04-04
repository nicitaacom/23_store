import { IMessageDB } from "@/ts/support/IMessageDB"
import { BaseSDK } from "@/sdk/BaseSDK"

export class SupportSDK extends BaseSDK {
  async sendMessage(request: API.SupportSendMessageRequest) {
    return this.postJson<API.SupportSendMessageRequest, API.SupportStatusResponse>(
      "/api/message/send",
      request satisfies API.SupportSendMessageRequest,
    )
  }

  async markMessagesAsSeen(request: API.SupportMarkMessagesAsSeenRequest) {
    return this.postJson<API.SupportMarkMessagesAsSeenRequest, API.SupportStatusResponse>(
      "/api/message/seen",
      request satisfies API.SupportMarkMessagesAsSeenRequest,
    )
  }

  async getMessages(request: API.SupportGetMessagesRequest) {
    return this.postJson<API.SupportGetMessagesRequest, IMessageDB[]>(
      "/api/messages/get-messages",
      request satisfies API.SupportGetMessagesRequest,
    )
  }

  async openTicket(request: API.SupportOpenTicketRequest) {
    return this.postJson<API.SupportOpenTicketRequest, API.SupportStatusResponse>(
      "/api/tickets/open",
      request satisfies API.SupportOpenTicketRequest,
    )
  }

  async closeTicket(request: API.SupportCloseTicketRequest) {
    return this.postJson<API.SupportCloseTicketRequest, API.SupportCloseTicketResponse>(
      "/api/tickets/close",
      request satisfies API.SupportCloseTicketRequest,
    )
  }

  async rateTicket(request: API.SupportRateTicketRequest) {
    return this.postJson<API.SupportRateTicketRequest, API.SupportCloseTicketResponse>(
      "/api/tickets/rate",
      request satisfies API.SupportRateTicketRequest,
    )
  }

  async getTicketId(request: API.SupportGetTicketIdRequest) {
    const response = await this.postJson<API.SupportGetTicketIdRequest, API.SupportGetTicketIdResponse | "">(
      "/api/ticket/get-ticket-id",
      request satisfies API.SupportGetTicketIdRequest,
    )

    return typeof response === "string" ? undefined : response.ticket_id ?? undefined
  }
}

export const supportSDK = new SupportSDK()
