// DO NOT import anything here

declare module API {
  type AccountSignInRequest = {
    email: string
  }

  type AccountSignInResponse = {
    providers?: string[] | null
  }

  type AccountSignUpRequest = {
    username: string
    email: string
    password: string
  }

  type AccountSignUpResponse = {
    user?: unknown
  }

  type AccountRecoverRequest = {
    email: string
  }

  type AccountRecoverResponse = {
    status: number
  }

  type AccountResetRequest = {
    email: string
    password: string
  }

  type AccountResetResponse = {
    user?: unknown
  }

  type AccountVerifyTurnstileRequest = {
    token: string
  }

  type AccountVerifyTurnstileResponse = {
    success: boolean
    error?: string
    errorCodes?: string[]
  }
}
