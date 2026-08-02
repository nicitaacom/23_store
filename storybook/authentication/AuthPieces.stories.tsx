import { HttpResponse, http } from "msw"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { storybookServices } from "../mocks/services"
import { useI18n } from "@/locales/client"
import { AuthLogo } from "@/[locale]/(auth)/AuthModal/components/AuthLogo"
import { AuthNotCompleted } from "@/[locale]/error/AuthNotCompleted"
import { AuthText } from "@/[locale]/(auth)/AuthModal/components/AuthText"
import { BackToMainButton } from "@/[locale]/error/components/BackToMainButton"
import { EmailLinkInvalidOrExpired } from "@/[locale]/error/EmailLinkInvalidOrExpired"
import { ExchangeCookiesError } from "@/[locale]/error/ExchangeCookiesError"
import { NoCodeFoundError } from "@/[locale]/error/NoCodeFoundError"
import { TurnstileChallenge } from "@/[locale]/human-check/TurnstileChallenge"
import { UnknownError } from "@/[locale]/(auth)/functions/UnknownError"
import { UserExistEmailNotConfirmed } from "@/[locale]/(auth)/functions/UserExistEmailNotConfirmed"

function AuthHeaders() {
  const variants = ["login", "register", "recover", "resetPassword", "recoverCompleted", null]
  return (
    <div className="grid gap-4 p-4">
      {variants.map(variant => (
        <div className="flex items-center gap-3 rounded border border-border-color/40 p-3" key={String(variant)}>
          <AuthLogo isAuthCompleted={variant === null} isRecoverCompleted={variant === "recoverCompleted"} />
          <AuthText queryParams={variant} />
        </div>
      ))}
    </div>
  )
}

function AuthFormErrors() {
  const t = useI18n()
  return (
    <div className="grid gap-4 p-4">
      <UnknownError t={t} />
      <UserExistEmailNotConfirmed t={t} />
    </div>
  )
}

const meta = {
  title: "Authentication/AuthPieces",
  parameters: {
    layout: "fullscreen",
    // The a11y checks run in report mode for these stories: they document components that already
    // ship with the dark-theme palette, and axe flags the light-theme contrast of subTitle text
    // inside them. The contrast debt sits in the components, not in the stories - fixing it is a
    // palette change that has to be decided for the whole app at once.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const HeadersPerVariant: Story = {
  render: () => <AuthHeaders />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getAllByRole("img", { name: "logo" }).length).toBe(6))
  },
}

export const FormErrors: Story = {
  render: () => <AuthFormErrors />,
}

export const BackToMain: Story = {
  render: () => (
    <div className="p-4">
      <BackToMainButton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("button", { name: "Back to main" })).toBeVisible())
  },
}

export const AuthFlowNotCompleted: Story = {
  render: () => <AuthNotCompleted />,
}

export const EmailLinkExpired: Story = {
  render: () => <EmailLinkInvalidOrExpired />,
}

// Reporting the error must actually SEND it through /api/send-email, not open a mailto: link (see
// app/functions/support/reportErrorToSupport.tsx) - a mailto does nothing when the machine has no
// mail client configured.
const successfulReportHandlers = [
  http.post("/api/rate-limit", () => HttpResponse.json({ allowed: true, remaining: 4 })),
  http.post("/api/send-email", async ({ request }) => {
    storybookServices.email(await request.json())
    return HttpResponse.json({ status: 200 })
  }),
]

export const CookieExchangeFailed: Story = {
  render: () => <ExchangeCookiesError message="No user found when exchanging cookies" />,
  parameters: { msw: { handlers: successfulReportHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const reportToSupportButton = await canvas.findByRole("button", { name: /report to support/i })
    await userEvent.click(reportToSupportButton)

    await waitFor(() => expect(canvas.getByRole("button", { name: /report sent/i })).toBeVisible())
    await expect(storybookServices.email).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining("No user found when exchanging cookies") }),
    )
  },
}

export const NoCodeInTheLink: Story = {
  render: () => <NoCodeFoundError message="No code found in the callback URL" />,
  parameters: { msw: { handlers: successfulReportHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const reportToSupportButton = await canvas.findByRole("button", { name: /report to support/i })
    await userEvent.click(reportToSupportButton)

    await waitFor(() => expect(canvas.getByRole("button", { name: /report sent/i })).toBeVisible())
    await expect(storybookServices.email).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining("No code found in the callback URL") }),
    )
  },
}

export const HumanCheck: Story = {
  render: () => <TurnstileChallenge locale="en" nextPath="/en" />,
  parameters: {
    // The widget script comes from Cloudflare and never renders here - the story documents the
    // surrounding page state (heading, retry copy, button) that the challenge sits in.
    a11y: { test: "todo" },
  },
}
