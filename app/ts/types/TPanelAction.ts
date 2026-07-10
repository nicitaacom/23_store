import type { PANEL_ACTIONS } from "@/components/ui/Modals/AdminPanel/components/AdminPanelHeader"

// eslint-disable-next-line local-rules/no-type-export-in-action-or-component -- this IS the dedicated type file (app/ts/types/); the rule's *Action.ts filename heuristic false-positives on the type's own name
export type TPanelAction = (typeof PANEL_ACTIONS)[keyof typeof PANEL_ACTIONS]
