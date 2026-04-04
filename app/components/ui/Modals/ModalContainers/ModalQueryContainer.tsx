"use client"

import { useCallback, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
}

export function ModalQueryContainer({
  children,
  modalQuery,
  className,
  closeButtonClassName,
  hideCloseButton = false,
}: ModalQueryContainerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryParams = useSearchParams()
  const { isLoading } = useLoading()
  const modalRef = useRef<HTMLDivElement | null>(null)

  const showModal = queryParams?.getAll("modal").includes(modalQuery)
  const [shouldClose, setShouldClose] = useState(false)

  // Close modal and redirect on close
  const closeModal = useCallback(() => {
    if (isLoading) return
    setShouldClose(true)
    setTimeout(() => {
      router.push(pathname ?? "/")
    }, 260)
  }, [isLoading, router, pathname])

  useOnEscOrClickOutside(modalRef, closeModal, {
    isHookEnabled: showModal && !shouldClose,
    ignoreInputs: true,
  })

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

  if (!showModal && !shouldClose) {
    return null
  }

  const content = typeof children === "function" ? children({ closeModal }) : children

  return (
    <AnimatePresence>
      {(showModal || shouldClose) && (
        <motion.div
          className="fixed inset-[0] bg-[rgba(0,0,0,0.5)] backdrop-blur z-[1601]
         flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={shouldClose ? { opacity: 0 } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          {...modalBgHandler}>
          <motion.div
            className={twMerge(
              `relative z-[1600] rounded-[24px] border border-border-color bg-foreground
              shadow-[0px_24px_80px_rgba(0,0,0,0.32)]`,
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
                  `absolute right-4 top-4 rounded-full border border-border-color/70 bg-background/70 p-1 text-icon-color cursor-pointer transition-colors duration-200 hover:bg-foreground-accent/40`,
                  closeButtonClassName,
                  isLoading && "opacity-50 cursor-default pointer-events-none",
                )}
                size={32}
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
