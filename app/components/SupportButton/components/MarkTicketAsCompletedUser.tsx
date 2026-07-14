"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CiStar } from "react-icons/ci"
import { FaStar } from "react-icons/fa"
import { FiCheckCircle } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { Button } from "@/components/ui"

interface MarkTicketAsCompletedUserProps {
  isClosedBySupport: boolean
  ticketId: string | null
  messagesLength: number
}

export function MarkTicketAsCompletedUser({ isClosedBySupport, ticketId, messagesLength }: MarkTicketAsCompletedUserProps) {
  const router = useRouter()
  const { closeDropdown } = useSupportDropdown()

  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [showMarkTicketAsCompleted, setShowMarkTicketAsCompleted] = useState(false)
  const [showRateThisTicket, setShowRateThisTicket] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  async function closeTicket() {
    setShowMarkTicketAsCompleted(false)
    setShowRateThisTicket(true)
    await supportSDK.closeTicket({ ticketId: ticketId || "", closedBy: "user" })
  }

  async function rateTicket(ratingValue: number | null) {
    setRating(ratingValue)
    setShowRateThisTicket(false)

    if (ratingValue) {
      setShowThankYou(true)
      setTimeout(() => {
        setShowThankYou(false)
        closeDropdown()
      }, 1500)
    } else {
      closeDropdown()
    }

    router.refresh()
    await supportSDK.rateTicket({ ticketId, rate: ratingValue })
  }

  const stars = Array.from({ length: 5 }, (_, index) => {
    const ratingValue = index + 1

    return (
      <button
        aria-label={`Rate ${ratingValue} out of 5`}
        className="rounded p-1 transition-transform duration-150 hover:scale-105"
        key={ratingValue}
        onMouseEnter={() => setHover(ratingValue)}
        onMouseLeave={() => setHover(null)}
        onClick={() => rateTicket(ratingValue)}
        type="button">
        {ratingValue <= (hover || rating || 0) ? (
          <FaStar className="text-warning" size={30} />
        ) : (
          <CiStar className="text-icon-color" size={30} />
        )}
      </button>
    )
  })

  const overlayClass = (isVisible: boolean, zIndex: string) =>
    twMerge(
      `absolute inset-0 ${zIndex} flex items-center justify-center bg-background/80 px-5 backdrop-blur-sm transition-all duration-200`,
      isVisible ? "visible opacity-100" : "invisible opacity-0",
    )

  return (
    <>
      <button
        aria-label={messagesLength === 0 ? "Close unavailable for empty ticket" : "Close ticket"}
        className={twMerge(
          "flex h-8 w-8 items-center justify-center rounded border border-white/16 bg-white/8 text-white/85 transition-colors duration-150 hover:border-success-accent/40 hover:bg-success-accent/15 hover:text-success-accent",
          messagesLength === 0 && "cursor-not-allowed opacity-55",
        )}
        onClick={() => messagesLength !== 0 && setShowMarkTicketAsCompleted(true)}
        title={messagesLength === 0 ? "I don't let you close empty ticket" : "Close ticket"}
        type="button">
        <FiCheckCircle size={16} />
      </button>

      <div className={overlayClass(showMarkTicketAsCompleted && !isClosedBySupport, "z-30")}>
        <div className="w-full max-w-[270px] rounded-lg border border-border-color/35 bg-foreground/95 p-4 text-center shadow-compact-lg">
          <h1 className="text-base font-semibold text-title">Close this ticket?</h1>
          <p className="mt-2 text-sm text-subTitle">You can rate the conversation right after closing it.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button className="w-fit" variant="success-outline" size="sm" onClick={closeTicket}>
              Yes
            </Button>
            <Button className="w-fit" variant="danger-outline" size="sm" onClick={() => setShowMarkTicketAsCompleted(false)}>
              No
            </Button>
          </div>
        </div>
      </div>

      <div className={overlayClass(showRateThisTicket || isClosedBySupport, "z-40")}>
        <div className="w-full max-w-[290px] rounded-lg border border-border-color/35 bg-foreground/95 p-4 text-center shadow-compact-lg">
          <h1 className="text-base font-semibold text-title">Please rate this ticket</h1>
          <div className="mt-3 flex justify-center gap-1.5">{stars}</div>
          <Button className="mt-3" variant="default-outline" size="sm" onClick={() => rateTicket(null)}>
            I don&apos;t want
          </Button>
        </div>
      </div>

      <div className={overlayClass(showThankYou, "z-50")}>
        <div className="w-full max-w-[220px] rounded-lg border border-border-color/35 bg-foreground/95 p-4 text-center shadow-compact-lg">
          <h1 className="text-lg font-semibold text-title">Thank you</h1>
        </div>
      </div>
    </>
  )
}
