/**
 * Sends one Telegram message from the server.
 *
 * It lives here rather than in `app/api/telegram/route.ts` because a route handler is reachable over
 * HTTP only - the weekly key check at `app/api/webhooks/check-envs/route.ts` runs on the server and
 * needs the same send without a request to itself. Both read this one function.
 */
export type TTelegramSendResult = {
  ok: boolean
  description?: string
  status: number
  statusText: string
  data: unknown
}

export async function sendTelegramMessage(message: string): Promise<TTelegramSendResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken) return { ok: false, description: "No telegram token", status: 500, statusText: "", data: null }
  if (!chatId) return { ok: false, description: "No telegram chat id", status: 500, statusText: "", data: null }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, parse_mode: "html", text: message }),
  })

  const responseData = await response.json()

  return {
    ok: response.ok && Boolean(responseData?.ok),
    description: responseData?.description,
    status: response.status,
    statusText: response.statusText,
    data: responseData,
  }
}
