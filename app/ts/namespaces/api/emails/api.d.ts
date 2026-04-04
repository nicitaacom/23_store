// DO NOT import anything here

declare module API {
  type EmailsSendRequest = {
    from: string
    to: string | null
    subject: string
    html: string
  }

  type EmailsSendResponse = {
    status: number
  }

  type EmailsRequestReplanishmentRequest = {
    owner_id: string
    subject: string
    html: string
  }

  type EmailsRequestReplanishmentResponse = {
    status: number
  }
}
