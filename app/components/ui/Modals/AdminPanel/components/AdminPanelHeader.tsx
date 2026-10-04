"use client"

import { IoMdClose } from "react-icons/io"
import { twMerge } from "tailwind-merge"
import { FiPlus } from "react-icons/fi"
import { CiEdit } from "react-icons/ci"
import { MdOutlineDelete, MdOutlineCategory, MdPriceChange } from "react-icons/md"

import { TPanelAction } from "@/ts/types/TPanelAction"
import { useScopedI18n } from "@/locales/client"
import { useSiteTheme } from "@/hooks/ui/useSiteTheme"
import { OrganicCanvasBackground } from "@/components/OrganicCanvasBackground"

export const PANEL_ACTIONS = {
  add: "add",
  edit: "edit",
  delete: "delete",
  pricing: "pricing",
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
  pricing: MdPriceChange,
  categories: MdOutlineCategory,
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
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
  const t = useScopedI18n("product")
  const siteTheme = useSiteTheme()

  return (
    <OrganicCanvasBackground
      // mark the whole header as a non-dismiss zone so clicking empty space (gaps/padding)
      // between the tabs doesn't trip the modal's click-outside handler and close it
      className={twMerge(
        "halloween-admin-header h-auto shrink-0 overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.12),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))] tablet:rounded-t-lg",
        className,
      )}
      data-click-outside-ignore
      parentClassName="relative flex h-auto flex-col gap-2 px-2 pb-2 pt-5 tablet:px-3 tablet:py-2"
      particleCount={3}
      brandHsl={siteTheme === "halloween" ? "25, 100%, 55%" : "137, 82%, 52%"}
      verticalOverflow={18}>
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85">{t("workspace")}</p>
          <h1 className="mt-px truncate text-[18px] font-semibold leading-none text-white tablet:text-[20px]">{title}</h1>
        </div>
        <button
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-white/25 bg-white/10 text-white transition-colors duration-150 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          data-cy="admin-panel-close"
          type="button"
          onClick={onClose}
          disabled={disabled}
          aria-label={t("close_admin_panel")}>
          <IoMdClose size={20} />
        </button>
      </div>

      <nav className="flex w-full min-w-0 gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label={title}>
        {(Object.keys(PANEL_ACTIONS) as TPanelAction[])
          .filter(action => action !== "categories" || roles.includes("ADMIN"))
          .map(action => {
            const Icon = ACTION_ICONS[action]
            const isActive = action === activeAction

            return (
              <button
                className={twMerge(
                  "flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  isActive
                    ? "border-brand/60 bg-brand/15 text-brand"
                    : "border-white/15 bg-white/5 text-white/80 hover:border-white/35 hover:text-white",
                )}
                data-cy={`admin-action-${action}`}
                key={action}
                type="button"
                onClick={() => onActionChange(action)}
                disabled={disabled}
                aria-pressed={isActive}>
                <Icon className="shrink-0 text-base" />
                <span>{actionLabels[action]}</span>
              </button>
            )
          })}
      </nav>
    </OrganicCanvasBackground>
  )
}
