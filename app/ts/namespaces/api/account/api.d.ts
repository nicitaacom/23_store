// DO NOT import anything here

declare namespace API {
  type AccountUpdateLanguageRequest = {
    language: import("@/ts/types/i18n/TLocaleTag").TLocaleTag
  }

  type AccountUpdateLanguageResponse = { success: true } | { error: string }

  type AccountSignInRequest = {
    email: string
  }

  type AccountSignInResponse = {
    providers?: string[] | null
    passwordResetRequired?: boolean
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
