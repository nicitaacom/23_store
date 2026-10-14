import type { ErrorResponse } from "resend"

type TResendSendFailure = {
  status: number
  message: string
}

/** Resend 3.x exposes no send idempotency key; retrying an uncertain send could duplicate email. */
export function describeResendSendFailure(error: ErrorResponse | null): TResendSendFailure {
  if (error?.name === "missing_api_key" || error?.name === "invalid_api_Key") {
    return {
      status: 503,
      message:
        "Email delivery is unavailable because the store email credentials were rejected. No message was sent. Contact support to restore email delivery.",
    }
  }

  if (error?.name === "invalid_from_address") {
    return {
      status: 503,
      message:
        "Email delivery is unavailable because the store sender address is not approved. No message was sent. Contact support to verify the sender address.",
    }
  }

  if (error?.name === "validation_error") {
    return {
      status: 400,
      message:
        "The email provider rejected the recipient or message details, so no message was sent. Check the recipient address and contact support if it is correct.",
    }
  }

  return {
    status: 502,
    message:
      "The email provider did not confirm delivery. Check the recipient inbox and spam folder, then contact support to trace the message before sending a duplicate.",
  }
}
