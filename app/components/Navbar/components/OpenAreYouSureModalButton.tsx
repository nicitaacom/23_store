"use client"

import { Button } from "@/components/ui/Button"
import { AnimatePresence, motion } from "framer-motion"
import { useSwipeable } from "react-swipeable"
import { useState } from "react"
import { IoMdClose } from "react-icons/io"
import useCartStore from "@/store/user/cartStore"

export default function OpenAreYouSureModalButton() {
  const [showModal, setShowModal] = useState(false)

  /* for e.stopPropagation when mousedown on modal and mouseup on modalBg */
  const modalBgHandler = useSwipeable({
    onTouchStartOrOnMouseDown: () => {
      setShowModal(false)
    },
    trackMouse: true,
  })

  const modalHandler = useSwipeable({
    onTouchStartOrOnMouseDown: e => {
      e.event.stopPropagation()
    },
    trackMouse: true,
  })

  const cartStore = useCartStore()

  return (
    <>
      <Button className="w-fit" onClick={() => setShowModal(true)}>
        Clear cart
      </Button>
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
              className={`relative bg-foreground border-[1px] border-border-color rounded-md z-[100] w-[320px]`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              {...modalHandler}>
              <IoMdClose
                className="absolute right-[0] top-[0] border-b-[1px] border-l-[1px] text-icon-color border-border-color rounded-bl-md cursor-pointer"
                size={32}
                onClick={() => setShowModal(false)}
              />

              {/* ARE-YOU-SURE-MODAL */}
              <div className="flex flex-col gap-y-2 py-4">
                <h1 className="text-center">Are you sure?</h1>
                <div className="flex flex-row gap-x-4 justify-center">
                  <Button variant="info-outline" onClick={() => setShowModal(false)}>
                    Back
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      cartStore.clearCart(), setShowModal(false)
                    }}>
                    Remove
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
