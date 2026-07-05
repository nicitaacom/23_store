import { create } from "zustand"

// Per-ticket unsent reply text for the support dashboard. Kept out of useMessagesStore (which the
// customer chat window shares) so a typed-but-unsent reply belongs to ITS ticket: typing in ticket A,
// switching to B, then back to A still shows A's draft. Not persisted — drafts live for the session only.
type SupportReplyDraftsStore = {
  draftsByTicketId: Record<string, string>
  setDraft: (ticketId: string, draftText: string) => void
  clearDraft: (ticketId: string) => void
}

export const useSupportReplyDrafts = create<SupportReplyDraftsStore>()(set => ({
  draftsByTicketId: {},
  setDraft: (ticketId, draftText) => set(state => ({ draftsByTicketId: { ...state.draftsByTicketId, [ticketId]: draftText } })),
  clearDraft: ticketId =>
    set(state => {
      const { [ticketId]: _removed, ...rest } = state.draftsByTicketId
      return { draftsByTicketId: rest }
    }),
}))
