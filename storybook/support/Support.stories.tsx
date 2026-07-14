import { useLayoutEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import type { TMessageDB } from "@/ts/support/TMessageDB"
import { createDeferred } from "../mocks/deferred"
import { customerUser } from "../fixtures/users"
import { fixtureMessages, FIXTURE_IDS } from "../fixtures"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useLoading } from "@/store/ui/useLoading"
import { useMessages } from "@/store/ui/useMessages"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import useUser from "@/store/user/useUser"
import { MarkTicketAsCompletedUser } from "@/components/SupportButton/components/MarkTicketAsCompletedUser"
import { MessageInput } from "@/components/ui/Inputs/MessageInput"
import { PastedImagePreview } from "@/components/SupportButton/components/PastedImagePreview"
import SupportButton from "@/components/SupportButton/SupportButton"

interface SupportExampleProps {
  isLoading?: boolean
  messages: TMessageDB[]
  open: boolean
  unread: number
  user: typeof customerUser | null
}

function SupportExample({ isLoading = false, messages, open, unread, user }: SupportExampleProps) {
  useLayoutEffect(() => {
    useUser.setState({ user })
    useLoading.setState({ isLoading })
    useMessages.setState({ messages, ticketId: FIXTURE_IDS.ticket, unseenMessagesNumber: unread })
    useSupportDropdown.setState({ isDropdown: open })
  }, [isLoading, messages, open, unread, user])

  return (
    <div className="min-h-[620px] bg-background p-6">
      <p className="max-w-md text-subTitle">Support stays available above the current page without contacting a live service.</p>
      <SupportButton />
    </div>
  )
}

interface ComposerExampleProps {
  onSend: (messageBody: string, image: File | null) => Promise<void>
}

const sendMessage = fn(async () => undefined)

function ComposerExample({ onSend }: ComposerExampleProps) {
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function handleSend(messageBody: string, image: File | null) {
    setErrorMessage("")
    setIsPending(true)
    try {
      await onSend(messageBody, image)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Message failed")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border-color bg-modal-surface">
      <MessageInput onSend={handleSend} placeholder="Write to support" />
      {isPending && (
        <p className="px-4 pb-3 text-sm text-info" role="status">
          Sending message…
        </p>
      )}
      {errorMessage && (
        <p className="px-4 pb-3 text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

function AttachmentExample() {
  useLayoutEffect(() => {
    useMessages.setState({ image: new File(["storybook image"], "support.png", { type: "image/png" }) })
  }, [])
  return (
    <div className="p-6">
      <PastedImagePreview />
    </div>
  )
}

function CompletedTicketExample({ closedBySupport = false }: { closedBySupport?: boolean }) {
  return (
    <div className="relative h-[340px] max-w-sm rounded-lg border border-border-color bg-modal-surface p-4">
      <MarkTicketAsCompletedUser
        isClosedBySupport={closedBySupport}
        messagesLength={fixtureMessages.length}
        ticketId={FIXTURE_IDS.ticket}
      />
    </div>
  )
}

const meta = {
  title: "Support/Customer chat",
  component: SupportExample,
  args: {
    messages: fixtureMessages,
    open: false,
    unread: 0,
    user: customerUser,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SupportExample>

export default meta
type Story = StoryObj<typeof meta>

export const ClosedButton: Story = {}
export const UnreadCount: Story = { args: { unread: 12 } }
export const OpenConversation: Story = { args: { open: true } }
export const EmptyConversation: Story = { args: { messages: [], open: true } }
export const LoadingConversation: Story = { args: { isLoading: true, open: true } }

export const MultiDayOwnAndForeignMessages: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Could you help me choose a variant?")).toBeVisible())
    await expect(canvas.getByText("The black variant is available and ready to ship.")).toBeVisible()
    await expect(canvas.getByRole("button", { name: /message attachment/i })).toBeVisible()
    await expect(canvas.getAllByText(/feb/i).length).toBeGreaterThanOrEqual(2)
  },
}

export const ImageFallback: Story = {
  args: {
    messages: [
      fixtureMessages[0],
      { ...fixtureMessages[1], id: "missing-image", images: ["/storybook-missing-support-image.png"] },
    ],
    open: true,
  },
}

export const OpenCloseAndCleanup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const findByRoleResp = await canvas.findByRole("button", { name: "Open support chat" })
    await userEvent.click(findByRoleResp)
    await waitFor(() => expect(findByRoleResp).toHaveAttribute("aria-expanded", "true"))
    await waitFor(() => expect(canvas.getByText("Could you help me choose a variant?")).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(findByRoleResp).toHaveAttribute("aria-expanded", "false"))
  },
}

export const AnonymousAccess: Story = { args: { messages: [], open: true, user: null } }
export const MobileLayout: Story = {
  args: { open: true },
  parameters: { viewport: { defaultViewport: "mobileSmall" } },
}
export const DesktopLayout: Story = {
  args: { open: true },
  parameters: { viewport: { defaultViewport: "desktop" } },
}

export const MessageSubmission: Story = {
  args: { messages: [], user: null },
  render: () => <ComposerExample onSend={sendMessage} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const findByPlaceholderTextResp = await canvas.findByPlaceholderText("Write to support")
    await userEvent.type(findByPlaceholderTextResp, "Please help with my order")
    await userEvent.click(canvas.getByRole("button"))
    await expect(findByPlaceholderTextResp).toHaveValue("")
    await expect(sendMessage).toHaveBeenCalledWith("Please help with my order", null)
  },
}

export const PendingSend: Story = {
  render: () => {
    const deferred = createDeferred<void>()
    return <ComposerExample onSend={fn(() => deferred.promise)} />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByPlaceholderText("Write to support"), "Pending reply")
    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByRole("status")).toHaveTextContent("Sending")
  },
}

export const FailedSend: Story = {
  render: () => (
    <ComposerExample
      onSend={fn(async () => {
        throw new Error("Support is temporarily unavailable")
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByPlaceholderText("Write to support"), "Retry this message")
    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByRole("alert")).toHaveTextContent("temporarily unavailable")
  },
}

export const AttachmentPreview: Story = {
  render: AttachmentExample,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText(/image attached/i)).toBeVisible()
    await userEvent.click(canvas.getByTitle(/remove image/i))
    await waitFor(() => expect(canvas.queryByText(/image attached/i)).not.toBeInTheDocument())
  },
}

export const CompletedBySupport: Story = { render: () => <CompletedTicketExample closedBySupport /> }

export const CompleteAndRate: Story = {
  render: () => <CompletedTicketExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByTitle("Close ticket"))
    await waitFor(() => expect(canvas.getByText("Close this ticket?")).toBeVisible())
    await userEvent.click(canvas.getByRole("button", { name: "Yes" }))
    await waitFor(() => expect(canvas.getByText("Please rate this ticket")).toBeVisible())
    await userEvent.click(canvas.getByRole("button", { name: "Rate 1 out of 5" }))
    await waitFor(() => expect(canvas.getByText("Thank you")).toBeVisible())
    await expect(supportSDK.closeTicket).toHaveBeenCalledWith({ closedBy: "user", ticketId: FIXTURE_IDS.ticket })
    await expect(supportSDK.rateTicket).toHaveBeenCalledWith({ rate: 1, ticketId: FIXTURE_IDS.ticket })
  },
}
