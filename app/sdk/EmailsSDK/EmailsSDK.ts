import { BaseSDK } from "@/sdk/BaseSDK"

export class EmailsSDK extends BaseSDK {
  async sendEmail(request: API.EmailsSendRequest) {
    return this.postJson<API.EmailsSendRequest, API.EmailsSendResponse>(
      "/api/send-email",
      request satisfies API.EmailsSendRequest,
    )
  }

  async sendRequestReplanishmentEmail(request: API.EmailsRequestReplanishmentRequest) {
    return this.postJson<API.EmailsRequestReplanishmentRequest, API.EmailsRequestReplanishmentResponse>(
      "/api/send-email/request-replanishment",
      request satisfies API.EmailsRequestReplanishmentRequest,
    )
  }

  async sendTelegramMessage(message: string) {
    return this.postJson<API.TelegramRequest, API.TelegramResponse>(
      "/api/telegram",
      { message } satisfies API.TelegramRequest,
    )
  }
}

export const emailsSDK = new EmailsSDK()
