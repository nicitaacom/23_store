import { useEffect, useState } from "react"
import { useSwipeable } from "react-swipeable"
import { AnimatePresence, motion } from "framer-motion"
import { IoMdClose } from "react-icons/io"

import { Button } from "."
import { IconType } from "react-icons"

interface ModalContainerProps {
  isOpen: boolean
  label: string | React.ReactNode
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
}

export function AreYouSureModal({
  isOpen,
  label,
  primaryButtonVariant,
  primaryButtonIcon: PrimaryButtonIcon,
  primaryButtonAction,
  primaryButtonLabel,
  secondaryButtonIcon: SecondaryButtonIcon,
  secondaryButtonVariant,
  secondaryButtonAction,
  secondaryButtonLabel,
  className,
}: ModalContainerProps) {
  const [showModal, setShowModal] = useState(isOpen)

  /* onOpen - show modal - disable scroll and scrollbar - hide navbar - show bg */
  useEffect(() => {
    setShowModal(isOpen)
    if (isOpen) {
      document.body.style.overflow = "hidden"
      document.body.style.width = "calc(100% - 17px)"
    }
  }, [isOpen])

  /* onClose - close modal - show navbar - show scrollbar */
  function closeModal() {
    secondaryButtonAction()
    document.body.removeAttribute("style")
  }

  //Close modal on esc
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      closeModal()
      document.removeEventListener("keydown", handleKeyDown)
    }
  }
  document.addEventListener("keydown", handleKeyDown)

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
          className="fixed inset-[0] bg-[rgba(0,0,0,0.2)] z-[2000]
         flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          {...modalBgHandler}>
          <motion.div
            className={`relative bg-foreground border-[1px] border-border-color rounded-md z-[100] shadow-[0px_0px_4px_8px_rgba(0,0,0,0.3)] ${className}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
            {...modalHandler}>
            <IoMdClose
              className="absolute right-[0] top-[0] border-b-[1px] border-l-[1px] text-icon-color border-border-color rounded-bl-md cursor-pointer"
              size={32}
              onClick={closeModal}
            />
            <div className="flex flex-col gap-y-4 pt-6 px-4 pb-8 max-w-[600px]">
              <h1 className="py-2 text-2xl text-center">{label}</h1>
              <div className="flex flex-row gap-x-2 justify-center tablet:justify-end">
                <Button
                  className="flex flex-row gap-x-1"
                  variant={secondaryButtonVariant ? secondaryButtonVariant : "default-outline"}
                  onClick={secondaryButtonAction}>
                  {secondaryButtonLabel} {SecondaryButtonIcon && <SecondaryButtonIcon />}
                </Button>
                <Button
                  className="flex flex-row gap-x-1"
                  variant={primaryButtonVariant ? primaryButtonVariant : "info"}
                  onClick={primaryButtonAction}>
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