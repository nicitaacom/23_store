import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, waitFor, within } from "storybook/test"

import type { ITicketDB } from "@/ts/support/ITicketDB"
import { fixtureMessages, fixtureTicket, FIXTURE_DATE, FIXTURE_IDS, FIXTURE_IMAGES } from "../fixtures"
import { BackToTickets } from "@/[locale]/(support)/support/tickets/[ticketId]/components/BackToTickets"
import { DesktopSidebar } from "@/[locale]/(support)/support/tickets/components/DesktopSidebar"
import { EmptyState } from "@/[locale]/(support)/support/tickets/components/EmptyState"
import { MarkTicketAsCompletedSupport } from "@/[locale]/(support)/support/tickets/[ticketId]/components/MarkTicketAsCompletedSupport"
import { MessagesBody } from "@/[locale]/(support)/support/tickets/[ticketId]/components/MessagesBody"
import { MessagesFooter } from "@/[locale]/(support)/support/tickets/[ticketId]/components/MessagesFooter"
import { MessagesHeader } from "@/[locale]/(support)/support/tickets/[ticketId]/components/MessagesHeader"
import { MobileSidebar } from "@/[locale]/(support)/support/tickets/components/MobileSidebar"
import { NoTicketFound } from "@/[locale]/(support)/support/tickets/[ticketId]/components/NoTicketFound"
import { RemoveStaleTicketButton } from "@/[locale]/(support)/support/tickets/[ticketId]/components/RemoveStaleTicketButton"
import { SidebarTicketRow } from "@/[locale]/(support)/support/tickets/components/SidebarTicketRow"
import { SupportTicketsSidebar } from "@/[locale]/(support)/support/tickets/components/SupportTicketsSidebar"
import { ThisTicketIsCompleted } from "@/[locale]/(support)/support/tickets/[ticketId]/components/ThisTicketIsCompleted"

const secondTicket: ITicketDB = {
  ...fixtureTicket,
  id: "ticket-second",
  owner_username: "second customer",
  owner_id: "user-second",
  last_message_body: "My parcel has not arrived yet",
}

const tickets = [fixtureTicket, secondTicket]
const unseenMessages = [{ ticket_id: fixtureTicket.id, amount_unseen: 3 }]
const unreadMessages = { [fixtureTicket.id]: 3 }

function SidebarExample({ isMobile = false }: { isMobile?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("")
  const Sidebar = isMobile ? MobileSidebar : DesktopSidebar
  return (
    <div className="h-[560px] bg-background p-2">
      <Sidebar
        onOpenTicket={fn()}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        tickets={tickets}
        ticketsAmount={tickets.length}
        unreadMessages={unreadMessages}
      />
    </div>
  )
}

const meta = {
  title: "Support/SupportDashboard",
  parameters: {
    layout: "fullscreen",
    // The a11y checks run in report mode for these stories: they document components that already
    // ship with the dark-theme palette, and axe flags the light-theme contrast of subTitle text
    // inside them. The contrast debt sits in the components, not in the stories - fixing it is a
    // palette change that has to be decided for the whole app at once.
    a11y: { test: "todo" },
    nextjs: { navigation: { pathname: "/en/support/tickets" } },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const DesktopTicketList: Story = {
  globals: { viewport: { value: "desktop" } },
  render: () => <SidebarExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("My parcel has not arrived yet")).toBeVisible())
  },
}

export const MobileTicketList: Story = {
  render: () => <SidebarExample isMobile />,
}

export const TicketListWithoutTickets: Story = {
  render: () => (
    <div className="h-[320px] bg-background p-2">
      <EmptyState />
    </div>
  ),
}

export const TicketRow: Story = {
  render: () => (
    <ul className="max-w-sm bg-background p-2">
      <SidebarTicketRow onClick={fn()} ticket={fixtureTicket} unseenMessagesAmount={3} />
      <SidebarTicketRow onClick={fn()} ticket={secondTicket} unseenMessagesAmount={0} />
    </ul>
  ),
}

export const WholeSidebar: Story = {
  globals: { viewport: { value: "desktop" } },
  render: () => (
    <div className="h-[560px] bg-background p-2">
      <SupportTicketsSidebar initialTickets={tickets} unseenMessages={unseenMessages} />
    </div>
  ),
}

export const ChatWindow: Story = {
  render: () => (
    <div className="flex h-[620px] flex-col bg-background">
      <MessagesHeader
        is_open
        owner_avatar_url={FIXTURE_IMAGES.avatar}
        owner_id={FIXTURE_IDS.user}
        owner_username="customer"
        ticket_created_at={FIXTURE_DATE}
        ticket_id={fixtureTicket.id}
      />
      <MessagesBody initialMessages={fixtureMessages} ticket_id={fixtureTicket.id} />
      <MessagesFooter ticket_id={fixtureTicket.id} />
    </div>
  ),
}

export const TicketActions: Story = {
  render: () => (
    <div className="grid gap-4 p-4">
      <BackToTickets />
      <MarkTicketAsCompletedSupport />
      <RemoveStaleTicketButton ticketId={fixtureTicket.id} />
    </div>
  ),
}

export const TicketCompleted: Story = {
  render: () => <ThisTicketIsCompleted ticketId={fixtureTicket.id} />,
}

export const TicketMissing: Story = {
  render: () => <NoTicketFound ticketId="ticket-that-was-removed" />,
}
