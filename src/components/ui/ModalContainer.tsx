import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSwipeable } from "react-swipeable"

import { IoMdClose } from "react-icons/io"

interface ModalContainerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function ModalContainer({ isOpen, onClose, children, className }: ModalContainerProps) {
  const [showModal, setShowModal] = useState(isOpen)

  /* onOpen - show modal - disable scroll and scrollbar - hide navbar - show bg */
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
  useEffect(() => {
    setShowModal(isOpen)
    if (isOpen) {
      document.body.style.overflow = "hidden"
      if (!isTouchDevice) document.body.style.width = "calc(100% - 17px)"
    }
  }, [isOpen, isTouchDevice])

  /* onClose - close modal - show navbar - show scrollbar */
  function closeModal() {
    onClose()
    document.body.removeAttribute("style")
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

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-[0] bg-[rgba(0,0,0,0.2)] z-[99]
         flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          {...modalBgHandler}>
          <motion.div
            className={`relative z-[100] bg-foreground border-[1px] border-border-color rounded-md ${className}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
            {...modalHandler}>
            <IoMdClose
              className="absolute right-[0] top-[0] border-l-[1px] border-b-[1px] border-border-color rounded-bl-md cursor-pointer"
              size={32}
              onClick={closeModal}
            />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
