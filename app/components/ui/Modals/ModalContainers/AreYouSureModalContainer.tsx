"use client"

import { useEffect, useRef } from "react"
import { IoMdClose } from "react-icons/io"
import { IconType } from "react-icons"
import { useSwipeable } from "react-swipeable"
import { AnimatePresence, motion } from "framer-motion"
import { twMerge } from "tailwind-merge"

import { Button } from "../.."
import type { ButtonProps } from "../../Button"
import { useLoading } from "@/store/ui/useLoading"

interface AreYouSureModalContainerProps {
  isOpen: boolean
  label: string | React.ReactNode
  subTitle?: string | React.ReactNode
  primaryButtonVariant?:
    | "link"
    | "default"
    | "default-outline"
    | "info"
    | "info-outline"
    | "warning"
    | "warning-outline"
    | "danger"
    | "danger-outline"
    | "success"
    | "success-outline"
    | "nav-link"
    | "continue-with"
    | null
    | undefined
  primaryButtonIcon?: IconType
  primaryButtonAction: () => void
  primaryButtonLabel: string
  secondaryButtonAction: () => void
  secondaryButtonLabel: string
  secondaryButtonVariant?:
    | "link"
    | "default"
    | "default-outline"
    | "info"
    | "info-outline"
    | "warning"
    | "warning-outline"
    | "danger"
    | "danger-outline"
    | "success"
    | "success-outline"
    | "nav-link"
    | "continue-with"
    | null
    | undefined
  secondaryButtonIcon?: IconType
  className?: string
  closeButtonClassName?: string
  contentClassName?: string
  titleClassName?: string
  subTitleClassName?: string
  actionsClassName?: string
  primaryButtonClassName?: string
  primaryButtonSize?: ButtonProps["size"]
  secondaryButtonClassName?: string
  secondaryButtonSize?: ButtonProps["size"]
  primaryButtonDataCy?: string
  secondaryButtonDataCy?: string
}

export function AreYouSureModalContainer({
  isOpen,
  label,
  subTitle,
  primaryButtonVariant,
  primaryButtonIcon: PrimaryButtonIcon,
  primaryButtonAction,
  primaryButtonLabel,
  secondaryButtonIcon: SecondaryButtonIcon,
  secondaryButtonVariant,
  secondaryButtonAction,
  secondaryButtonLabel,
  className,
  closeButtonClassName,
  contentClassName,
  titleClassName,
  subTitleClassName,
  actionsClassName,
  primaryButtonClassName,
  primaryButtonSize = "md",
  secondaryButtonClassName,
  secondaryButtonSize = "md",
  primaryButtonDataCy,
  secondaryButtonDataCy,
}: AreYouSureModalContainerProps) {
  const { isLoading } = useLoading()
  const primaryButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  function closeModal() {
    if (isLoading) return
    secondaryButtonAction()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && !isLoading) {
      event.stopImmediatePropagation()
      closeModal()
    }
  }

  useEffect(() => {
    if (!isOpen) return
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    let raf: number
    const tryFocus = () => {
      if (primaryButtonRef.current) {
        primaryButtonRef.current.focus()
      } else {
        raf = requestAnimationFrame(tryFocus)
      }
    }
    const timer = setTimeout(tryFocus, 200)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [isOpen])

  //correct way to add event listener to listen keydown
  useEffect(() => {
    //line below needed to don't add event listener (you may uncomment it and try to close modal)
    if (!isOpen) return
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isOpen])

  /* for e.stopPropagation when mousedown on modal and mouseup on modalBg */
  const modalBgHandler = useSwipeable({
    onTouchStartOrOnMouseDown: () => {
      closeModal()
    },
    trackMouse: true,
  })

  const modalHandler = useSwipeable({
    onTouchStartOrOnMouseDown: e => {
      e.event.stopPropagation()
    },
    trackMouse: true,
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/60 px-3 py-4 backdrop-blur-[2px]"
          data-click-outside-ignore
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          {...modalBgHandler}>
          <motion.div
            className={twMerge(
              "relative z-[100] w-[min(calc(100vw-2rem),560px)] overflow-hidden rounded-lg border border-border-color/35 bg-foreground/95 shadow-compact",
              className,
            )}
            data-click-outside-ignore
            role="dialog"
            aria-modal="true"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 440, damping: 36, mass: 0.85 }}
            {...modalHandler}>
            <button
              className={twMerge(
                "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded border border-border-color/35 bg-background/55 text-icon-color transition-colors duration-150 hover:bg-foreground/50",
                closeButtonClassName,
                isLoading && "opacity-50 cursor-default pointer-events-none",
              )}
              aria-label="Close confirmation"
              disabled={isLoading}
              onClick={closeModal}
              type="button">
              <IoMdClose size={22} />
            </button>
            <div className={twMerge("flex max-w-[620px] flex-col gap-4 px-4 pb-4 pt-5 tablet:px-5", contentClassName)}>
              <div className={twMerge("flex flex-col gap-2 pr-10 text-start", titleClassName)}>
                <div className="font-secondary text-xl font-bold leading-tight text-title">{label}</div>
                {subTitle && <div className={twMerge("text-sm leading-6 text-subTitle", subTitleClassName)}>{subTitle}</div>}
              </div>
              <div className={twMerge("flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end", actionsClassName)}>
                <Button
                  className={twMerge(
                    // strong ring on :focus (not only :focus-visible) so the button the modal auto-focuses is obviously highlighted before Enter acts on it
                    "px-3 ring-offset-2 ring-offset-foreground focus:scale-[1.02] focus:ring-2 focus:ring-current focus-visible:scale-[1.02] focus-visible:ring-2 focus-visible:ring-current",
                    secondaryButtonClassName,
                  )}
                  data-cy={secondaryButtonDataCy}
                  variant={secondaryButtonVariant ? secondaryButtonVariant : "default-outline"}
                  size={secondaryButtonSize}
                  onClick={secondaryButtonAction}
                  disabled={isLoading}>
                  {secondaryButtonLabel} {SecondaryButtonIcon && <SecondaryButtonIcon />}
                </Button>
                <Button
                  className={twMerge(
                    "px-3 ring-offset-2 ring-offset-foreground focus:scale-[1.02] focus:ring-2 focus:ring-current focus-visible:scale-[1.02] focus-visible:ring-2 focus-visible:ring-current",
                    primaryButtonClassName,
                  )}
                  data-cy={primaryButtonDataCy}
                  ref={primaryButtonRef}
                  variant={primaryButtonVariant ? primaryButtonVariant : "info"}
                  size={primaryButtonSize}
                  onClick={primaryButtonAction}
                  disabled={isLoading}>
                  {primaryButtonLabel} {PrimaryButtonIcon && <PrimaryButtonIcon />}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
