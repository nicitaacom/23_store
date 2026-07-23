"use client"

import { IoMdClose } from "react-icons/io"
import { twMerge } from "tailwind-merge"
import { FiPlus } from "react-icons/fi"
import { CiEdit } from "react-icons/ci"
import { MdOutlineDelete, MdOutlineCategory } from "react-icons/md"

import { TPanelAction } from "@/ts/types/TPanelAction"
import { OrganicCanvasBackground } from "@/components/OrganicCanvasBackground"

export const PANEL_ACTIONS = {
  add: "add",
  edit: "edit",
  delete: "delete",
  categories: "categories",
} as const

interface AdminPanelHeaderProps {
  className?: string
  title: string
  activeAction: TPanelAction
  actionLabels: Record<TPanelAction, string>
  onActionChange: (action: TPanelAction) => void
  onClose: () => void
  disabled?: boolean
  roles: string[]
}

const ACTION_ICONS: Record<TPanelAction, typeof FiPlus> = {
  add: FiPlus,
  edit: CiEdit,
  delete: MdOutlineDelete,
  categories: MdOutlineCategory,
}

export function AdminPanelHeader({
  className,
  title,
  activeAction,
  actionLabels,
  onActionChange,
  onClose,
  disabled,
  roles,
}: AdminPanelHeaderProps) {
  return (
    <OrganicCanvasBackground
      // mark the whole header as a non-dismiss zone so clicking empty space (gaps/padding)
      // between the tabs doesn't trip the modal's click-outside handler and close it
      className={twMerge(
        "h-[52px] overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.12),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))] tablet:h-[56px] tablet:rounded-t-lg",
        className,
      )}
      data-click-outside-ignore
      parentClassName="relative flex h-full items-center justify-between gap-2 px-2 py-2 tablet:px-3"
      particleCount={3}
      brandHsl="137, 82%, 52%"
      verticalOverflow={18}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85">Workspace</p>
          <h1 className="mt-px truncate text-[18px] font-semibold leading-none text-white tablet:text-[20px]">{title}</h1>
        </div>

        <div className="ml-2 hidden min-w-0 flex-1 items-center gap-1 mobile:flex">
          {(Object.keys(PANEL_ACTIONS) as TPanelAction[])
            .filter(action => action !== "categories" || roles.includes("ADMIN"))
            .map(action => {
              const Icon = ACTION_ICONS[action]
              const isActive = action === activeAction

              return (
                <button
                  className={twMerge(
                    // underline tab — flat, unified brand accent (active shows a brand underline bar)
                    "relative flex h-8 min-w-0 items-center gap-1.5 px-2 text-xs transition-colors duration-150",
                    isActive ? "text-brand" : "text-white/60 hover:text-white",
                    disabled && "pointer-events-none opacity-50",
                  )}
                  data-cy={`admin-action-${action}`}
                  key={action}
                  type="button"
                  onClick={() => onActionChange(action)}>
                  <Icon className="shrink-0" />
                  <span className="truncate">{actionLabels[action]}</span>
                  {isActive && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-brand" />}
                </button>
              )
            })}
        </div>
      </div>

      <button
        className={twMerge(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/16 bg-white/8 text-white transition-colors duration-150 hover:bg-white/14",
          disabled && "pointer-events-none opacity-50",
        )}
        type="button"
        onClick={onClose}
        aria-label="Close admin panel">
        <IoMdClose size={20} />
      </button>
    </OrganicCanvasBackground>
  )
}
