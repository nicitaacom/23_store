"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { IoMdClose } from "react-icons/io"
import { useSwipeable } from "react-swipeable"
import { twMerge } from "tailwind-merge"
import { AnimatePresence, motion } from "framer-motion"

import { useLoading } from "@/store/ui/useLoading"
import useOnEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

interface ModalQueryContainerProps {
  children: React.ReactNode | ((props: { closeModal: () => void }) => React.ReactNode)
  modalQuery: string
  className?: string
  closeButtonClassName?: string
  hideCloseButton?: boolean
  disableDismiss?: boolean
  ignoreInputs?: boolean
}

export function ModalQueryContainer({
  children,
  modalQuery,
  className,
  closeButtonClassName,
  hideCloseButton = false,
  disableDismiss = false,
  ignoreInputs = true,
}: ModalQueryContainerProps) {
  const pathname = usePathname()
  const queryParams = useSearchParams()
  const { isLoading } = useLoading()
  const modalRef = useRef<HTMLDivElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)

  const showModal = queryParams?.getAll("modal").includes(modalQuery)
  const [shouldClose, setShouldClose] = useState(false)

  // Reset closing state whenever the modal is (re)opened via the URL
  useEffect(() => {
    if (showModal) setShouldClose(false)
  }, [showModal])

  // Close modal: animate out, then strip the ?modal param WITHOUT a server roundtrip.
  // history.replaceState (instead of router.push) avoids re-running the server layout
  // (getOwnerProducts / auth) and re-tracking utm params on every modal close.
  const closeModal = useCallback(() => {
    if (isLoading || disableDismiss) return
    setShouldClose(true)
    setTimeout(() => {
      window.history.replaceState(null, "", pathname ?? "/")
    }, 260)
  }, [disableDismiss, isLoading, pathname])

  useOnEscOrClickOutside(modalRef, closeModal, {
    isHookEnabled: showModal && !shouldClose && !disableDismiss,
    ignoreInputs,
  })

  /* Close only when the interaction starts on the backdrop itself, not when
     a touch/drag begins inside the modal and the pointer ends up outside.
     Checking e.event.target === backdropRef.current prevents bubbled events
     from modal content triggering close on tablets. */
  const modalBgHandler = useSwipeable({
    onTouchStartOrOnMouseDown: e => {
      if (!disableDismiss && e.event.target === backdropRef.current) {
        closeModal()
      }
    },
    trackMouse: true,
  })

  const modalHandler = useSwipeable({
    onTouchStartOrOnMouseDown: e => {
      e.event.stopPropagation()
    },
    trackMouse: true,
  })

  if (!showModal) {
    return null
  }

  const content = typeof children === "function" ? children({ closeModal }) : children

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-[1601] flex items-center justify-center bg-background/60 px-3 py-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={shouldClose ? { opacity: 0 } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          {...modalBgHandler}
          ref={node => {
            backdropRef.current = node
            modalBgHandler.ref(node)
          }}>
          <motion.div
            className={twMerge(
              "relative z-[1600] overflow-hidden rounded-lg border border-border-color/35 bg-modal-surface shadow-compact",
              className,
            )}
            initial={{ y: 16, opacity: 0 }}
            animate={shouldClose ? { y: 8, opacity: 0 } : { y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
            {...modalHandler}
            ref={modalRef}>
            {!hideCloseButton && (
              <IoMdClose
                className={twMerge(
                  "absolute right-3 top-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-border-color/35 bg-background/55 text-icon-color transition-colors duration-150 hover:bg-foreground/50",
                  closeButtonClassName,
                  (isLoading || disableDismiss) && "opacity-50 cursor-default pointer-events-none",
                )}
                size={22}
                onClick={closeModal}
              />
            )}
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
