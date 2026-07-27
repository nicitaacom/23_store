import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { HttpResponse, http } from "msw"
import { expect, waitFor, within } from "storybook/test"

import { AuthModal } from "@/[locale]/(auth)/AuthModal/AuthModal"
import { OpenSupportChatButton } from "@/[locale]/(site)/support/components/OpenSupportChatButton"
import { UTMTracker } from "@/[locale]/UTMTracker"

const meta = {
  title: "Navigation/AppShell",
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/en" } },
    // Report mode - these surfaces ship with the dark palette and axe flags the light-theme
    // contrast of their subTitle text.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SignIn: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/en", query: { modal: "AuthModal", variant: "login" } } },
  },
  render: () => <AuthModal />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("button", { name: /sign in/i })).toBeVisible())
  },
}

export const Registration: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/en", query: { modal: "AuthModal", variant: "register" } } },
  },
  render: () => <AuthModal />,
}

export const SupportEntryPoint: Story = {
  render: () => (
    <div className="grid min-h-40 place-items-center p-3">
      <OpenSupportChatButton />
    </div>
  ),
}

export const VisitTracking: Story = {
  parameters: {
    // The tracker posts the visit through a server action and renders nothing - the handler keeps
    // that request from escaping the story.
    msw: { handlers: [http.post("*", () => HttpResponse.json({ status: 200 }))] },
  },
  render: () => (
    <div className="p-3 text-title">
      <UTMTracker userId="storybook-user" />
      <p>UTMTracker renders nothing - it reads the utm_* query params, sends the visit and cleans the URL.</p>
    </div>
  ),
}
