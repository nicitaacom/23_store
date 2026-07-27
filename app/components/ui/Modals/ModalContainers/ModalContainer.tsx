"use client"

import { useEffect, useRef } from "react"
import { IoMdClose } from "react-icons/io"
import { useSwipeable } from "react-swipeable"
import { AnimatePresence, motion } from "framer-motion"
import { twMerge } from "tailwind-merge"

import { useLoading } from "@/store/ui/useLoading"

interface ModalContainerProps {
  isOpen: boolean
  onClose: () => void
  className?: string
  classnameContainer?: string
  label?: string | React.ReactNode
  children: React.ReactNode
}

// http://localhost:6006/?path=/story/ui-overlays-modal-containers-modalcontainer--open
export function ModalContainer({
  isOpen,
  onClose,
  className,
  classnameContainer,
  label,
  children,
}: ModalContainerProps) {
  const { isLoading } = useLoading()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  function closeModal() {
    if (isLoading) return
    onClose()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape" || isLoading) return

    const active = document.activeElement
    const inputFocused = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement

    if (inputFocused) {
      ;(active as HTMLElement).blur()
      return
    }

    closeModal()
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  useEffect(() => {
    if (!isOpen) return

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const animationFrame = requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      cancelAnimationFrame(animationFrame)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [isOpen])

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
          className={twMerge(
            `fixed inset-0 z-[49] flex items-center justify-center bg-background/60 px-3 py-4 backdrop-blur-[2px]`,
            classnameContainer,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          {...modalBgHandler}>
          <motion.div
            className={twMerge(
              "relative z-[50] overflow-hidden rounded-lg border border-border-color/35 bg-foreground shadow-compact",
              className,
            )}
            aria-label={typeof label === "string" ? label : "Modal"}
            aria-modal="true"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
            role="dialog"
            {...modalHandler}>
            <button
              className={twMerge(
                  "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded border border-border-color/35 bg-background/55 text-icon-color transition-colors duration-150 hover:bg-foreground/50",
                  isLoading && "opacity-50 cursor-default pointer-events-none",
                )}
              aria-label="Close modal"
              disabled={isLoading}
              onClick={closeModal}
              ref={closeButtonRef}
              type="button">
              <IoMdClose size={22} />
            </button>
            <div className="flex max-w-[600px] flex-col gap-3 px-4 pb-4 pt-5">
              {label && <div className="py-1 text-xl text-center text-title">{label}</div>}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
