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
        "h-[56px] overflow-hidden rounded-t-[28px] border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.16),transparent_32%),linear-gradient(135deg,rgba(13,17,23,0.98),rgba(20,26,35,0.94))] tablet:h-[60px]",
        className,
      )}
      parentClassName="relative flex h-full items-center justify-between gap-2 px-3 py-2 tablet:px-4"
      particleCount={3}
      brandHsl="137, 82%, 52%"
      verticalOverflow={18}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">Workspace</p>
          <h1 className="mt-[2px] truncate text-[20px] font-semibold leading-none text-white tablet:text-[24px]">{title}</h1>
        </div>

        <div className="ml-2 hidden min-w-0 flex-1 items-center gap-[2px] mobile:flex">
          {(Object.keys(PRODUCT_ACTIONS) as ProductAction[]).map(action => {
            const Icon = ACTION_ICONS[action]
            const isActive = action === activeAction

            return (
              <button
                key={action}
                className={twMerge(
                  "flex h-9 min-w-0 items-center gap-[6px] rounded-[14px] border px-3 text-sm transition-all duration-200",
                  isActive
                    ? "border-brand bg-brand/12 text-white shadow-[0_0_0_1px_rgba(32,233,89,0.18)]"
                    : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.05]",
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
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/8 text-white transition-all duration-200 hover:bg-white/14",
          disabled && "pointer-events-none opacity-50",
        )}
        type="button"
        onClick={onClose}
        aria-label="Close admin panel">
        <IoMdClose size={24} />
      </button>
    </OrganicCanvasBackground>
  )
}
