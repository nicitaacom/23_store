"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { IoMdClose } from "react-icons/io"
import { useSwipeable } from "react-swipeable"
import { twMerge } from "tailwind-merge"
import { AnimatePresence, motion } from "framer-motion"
import { useLoading } from "@/store/ui/useLoading"

interface ModalQueryContainerProps {
  children: React.ReactNode
  modalQuery: string
  className?: string
}

export function ModalQueryContainer({ children, modalQuery, className }: ModalQueryContainerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryParams = useSearchParams()
  const isLoading = useLoading.getState().isLoading

  const showModal = queryParams?.getAll("modal").includes(modalQuery)
  const [shouldClose, setShouldClose] = useState(false)

  //correct way to add event listener to listen keydown
  useEffect(() => {
    //event listener required because I add event listener on document in AreYouSureModalContainer
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // Close modal and redirect on close
  const closeModal = useCallback(() => {
    setShouldClose(true)
    setTimeout(() => {
      router.push(pathname ?? "/")
    }, 500)
  }, [router, pathname])

  //Close modal on esc
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      //to prevent focus state on browser searchbar
      event.preventDefault()
    }
    if (event.key === "Escape" && !isLoading) {
      closeModal()
    }
  }

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

  if (!showModal) {
    return null
  }

  return (
    <AnimatePresence>
      {shouldClose ||
        (showModal && (
          <motion.div
            className="fixed inset-[0] bg-[rgba(0,0,0,0.5)] backdrop-blur z-[1601]
         flex justify-center items-center"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.8 }}
            transition={{ duration: 0.25 }}
            {...modalBgHandler}>
            <motion.div
              className={`relative bg-foreground border-[1px] border-border-color rounded-md py-8 z-[1600] shadow-[0px_0px_4px_8px_rgba(0,0,0,0.3)] ${className}`}
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0.8 }}
              transition={{ duration: 0.25 }}
              {...modalHandler}>
              <IoMdClose
                className={twMerge(
                  `absolute right-[0] top-[0] border-b-[1px] border-l-[1px] text-icon-color border-border-color rounded-bl-md cursor-pointer`,
                  isLoading && "opacity-50 cursor-default pointer-events-none",
                )}
                size={32}
                onClick={closeModal}
              />
              {children}
            </motion.div>
          </motion.div>
        ))}
    </AnimatePresence>
  )
}
