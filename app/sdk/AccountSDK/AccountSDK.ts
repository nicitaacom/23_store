import { BaseSDK } from "@/sdk/BaseSDK"

export class AccountSDK extends BaseSDK {
  async updateAvatarUrl(avatarUrl: string): Promise<API.UpdateAvatarResponse> {
    return this.postJson<API.UpdateAvatarRequest, API.UpdateAvatarResponse>(
      "/api/account/avatar",
      {
        avatarUrl,
      } satisfies API.UpdateAvatarRequest,
    )
  }

  async signInWithEmail(email: string) {
    return this.postJson<API.AccountSignInRequest, API.AccountSignInResponse>(
      "/api/auth/login",
      { email } satisfies API.AccountSignInRequest,
    )
  }

  async signUp(request: API.AccountSignUpRequest) {
    return this.postJson<API.AccountSignUpRequest, API.AccountSignUpResponse>(
      "/api/auth/register",
      request satisfies API.AccountSignUpRequest,
    )
  }

  async recoverPassword(email: string) {
    return this.postJson<API.AccountRecoverRequest, API.AccountRecoverResponse>(
      "/api/auth/recover",
      { email } satisfies API.AccountRecoverRequest,
    )
  }

  async resetPassword(request: API.AccountResetRequest) {
    return this.postJson<API.AccountResetRequest, API.AccountResetResponse>(
      "/api/auth/reset",
      request satisfies API.AccountResetRequest,
    )
  }

  async verifyTurnstile(token: string) {
    return this.postJson<API.AccountVerifyTurnstileRequest, API.AccountVerifyTurnstileResponse>(
      "/api/turnstile/verify",
      { token } satisfies API.AccountVerifyTurnstileRequest,
    )
  }
}

export const accountSDK = new AccountSDK()
