"use client"

import { IoMdClose } from "react-icons/io"
import { twMerge } from "tailwind-merge"
import { AiOutlinePlus } from "react-icons/ai"
import { CiEdit } from "react-icons/ci"
import { MdOutlineDelete } from "react-icons/md"

import { OrganicCanvasBackground } from "@/components/OrganicCanvasBackground"

const PRODUCT_ACTIONS = {
  add: "add",
  edit: "edit",
  delete: "delete",
} as const

type ProductAction = (typeof PRODUCT_ACTIONS)[keyof typeof PRODUCT_ACTIONS]

interface AdminPanelHeaderProps {
  className?: string
  title: string
  activeAction: ProductAction
  actionLabels: Record<ProductAction, string>
  onActionChange: (action: ProductAction) => void
  onClose: () => void
  disabled?: boolean
}

const ACTION_ICONS: Record<ProductAction, typeof AiOutlinePlus> = {
  add: AiOutlinePlus,
  edit: CiEdit,
  delete: MdOutlineDelete,
}

const ACTION_ICON_COLORS: Record<ProductAction, string> = {
  add: "text-success-accent",
  edit: "text-warning",
  delete: "text-danger",
}

export function AdminPanelHeader({
  className,
  title,
  activeAction,
  actionLabels,
  onActionChange,
  onClose,
  disabled,
}: AdminPanelHeaderProps) {
  return (
    <OrganicCanvasBackground
      className={twMerge(
        "h-[52px] overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.12),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))] tablet:h-[56px] tablet:rounded-t-lg",
        className,
      )}
      parentClassName="relative flex h-full items-center justify-between gap-2 px-2 py-2 tablet:px-3"
      particleCount={3}
      brandHsl="137, 82%, 52%"
      verticalOverflow={18}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85">Workspace</p>
          <h1 className="mt-px truncate text-[18px] font-semibold leading-none text-white tablet:text-[20px]">{title}</h1>
        </div>

        <div className="ml-2 hidden min-w-0 flex-1 items-center gap-[2px] mobile:flex">
          {(Object.keys(PRODUCT_ACTIONS) as ProductAction[]).map(action => {
            const Icon = ACTION_ICONS[action]
            const isActive = action === activeAction

            return (
              <button
                key={action}
                className={twMerge(
                  "flex h-8 min-w-0 items-center gap-1 rounded border px-2.5 text-xs transition-colors duration-150",
                  isActive
                    ? action === PRODUCT_ACTIONS.add
                      ? "border-success/50 bg-success/20 text-success-accent"
                      : action === PRODUCT_ACTIONS.edit
                        ? "border-warning/50 bg-warning/20 text-warning"
                        : "border-danger/50 bg-danger/20 text-danger"
                    : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.05] hover:text-white",
                  disabled && "pointer-events-none opacity-50",
                )}
                type="button"
                onClick={() => onActionChange(action)}>
                <span className="truncate">{actionLabels[action]}</span>
                <Icon className={twMerge("shrink-0", ACTION_ICON_COLORS[action])} />
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
