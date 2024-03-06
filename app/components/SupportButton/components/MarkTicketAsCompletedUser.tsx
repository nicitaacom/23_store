"use client"

import Image from "next/image"
import axios from "axios"
import { twMerge } from "tailwind-merge"
import { CiStar } from "react-icons/ci"
import { FaStar } from "react-icons/fa"

import { TAPITicketsClose } from "@/api/tickets/close/route"
import { TAPITicketsRate } from "@/api/tickets/rate/route"
import useDarkMode from "@/store/ui/darkModeStore"
import { Button } from "@/components/ui"
import { useEffect, useState } from "react"
import { useSupportDropdown } from "@/store/ui/supportDropdown"
import { useRouter } from "next/navigation"
import { pusherClient } from "@/libs/pusher"

interface MarkTicketAsCompletedUserProps {
  ticketId: string | null // please don't set ticketId as empty string (I was so confused to undestand code)
  messagesLength: number
}

export function MarkTicketAsCompletedUser({ ticketId, messagesLength }: MarkTicketAsCompletedUserProps) {
  const router = useRouter()

  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const { closeDropdown } = useSupportDropdown()

  // It might be possible to do it with enum - I tried - it doesn't work
  const [showMarkTicketAsCompleted, setShowMarkTicketAsCompleted] = useState(false)
  const [showRateThisTicket, setShowRateThisTicket] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const { isDarkMode } = useDarkMode()

  async function closeTicket() {
    setShowMarkTicketAsCompleted(false)
    setShowRateThisTicket(true)
    await axios.post("api/tickets/close", { ticketId: ticketId, closedBy: "user" } as TAPITicketsClose)
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
    await axios.post("/api/tickets/rate", { ticketId: ticketId, rate: ratingValue } as TAPITicketsRate)
  }

  const starts = [
    ...Array(5)
      .fill(0)
      .map((withoutItIuuse, index: number) => {
        const ratingValue = index + 1 //start not from 0 but from 1
        return (
          //TODO - fix onClick on mobiles - https://streamable.com/vo9rnk
          <label key={index}>
            <input style={{ display: "none" }} name="star" type="radio" value={ratingValue} />
            <div
              className="cursor-pointer"
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(null)}
              onClick={() => rateTicket(ratingValue)}>
              {ratingValue <= (hover || rating!) ? (
                <FaStar className="text-[#E49B0F]" size={32} />
              ) : (
                <CiStar className="text-icon-color" size={32} />
              )}
            </div>
          </label>
        )
      }),
  ]

  useEffect(() => {
    if (!ticketId) return
    pusherClient.subscribe(ticketId)

    const closeBySupportHandler = () => {
      setShowMarkTicketAsCompleted(false)
      setShowRateThisTicket(true)
    }

    pusherClient.bind("tickets:closeBySupport", closeBySupportHandler)

    return () => {
      pusherClient.unsubscribe(ticketId)
    }
  }, [ticketId, router])

  return (
    <>
      <div className="tooltip">
        <div
          className={twMerge(
            "p-2 hover:bg-success/10 duration-150 rounded-md w-fit cursor-pointer",
            messagesLength === 0 ? "cursor-not-allowed" : "cursor-pointer",
          )}
          onClick={() => messagesLength !== 0 && setShowMarkTicketAsCompleted(true)}>
          <Image
            src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
            alt="close ticket"
            width={32}
            height={32}
          />
        </div>
        {messagesLength === 0 && (
          <div className="tooltiptext whitespace-nowrap translate-x-[-90%]">I don&apos; let you close empty ticket</div>
        )}
      </div>
      {/* CLOSE THIS TICKET? */}
      <div
        className={twMerge(
          `absolute bg-[rgba(0,0,0,0.75)] inset-[1px] z-[21]
          before:absolute before:w-4 before:h-4 before:bottom-0 before:right-0
          before:translate-x-[-50%] before:translate-y-[50%] before:rotate-45
          before:border-l-0 before:border-t-0 before:border-r before:border-b
           before:bg-[rgba(0,0,0,0.75)] before:z-[2] before:border-border-color/25
          flex justify-center items-center`,
          showMarkTicketAsCompleted
            ? "opacity-100 visible transition-all duration-300"
            : "opacity-0 invisible transition-all duration-300",
        )}>
        <div className="flex flex-col gap-y-2">
          <h1>Are you sure you want to close this ticket?</h1>
          <div className="flex flex-row gap-x-2 justify-center">
            <Button className="w-fit" variant="success-outline" onClick={closeTicket}>
              Yes
            </Button>
            <Button className="w-fit" variant="danger-outline" onClick={() => setShowMarkTicketAsCompleted(false)}>
              No
            </Button>
          </div>
        </div>
      </div>
      {/* RATE THIS TICKET */}
      <div
        className={twMerge(
          `absolute bg-[rgba(0,0,0,0.75)] inset-[1px] z-[31]
          before:absolute before:w-4 before:h-4 before:bottom-0 before:right-0
          before:translate-x-[-50%] before:translate-y-[50%] before:rotate-45
          before:border-l-0 before:border-t-0 before:border-r before:border-b
           before:bg-[rgba(0,0,0,0.75)] before:z-[2] before:border-border-color/25
          flex justify-center items-center`,
          showRateThisTicket
            ? "opacity-100 visible transition-all duration-300"
            : "opacity-0 invisible transition-all duration-300",
        )}>
        <div className="flex flex-col gap-y-2">
          <h1 className="text-center">Please rate this ticket</h1>
          <div className="flex flex-row gap-x-2">{starts}</div>
          <div className="flex flex-row gap-x-2 justify-center">{}</div>
          <Button variant="default-outline" onClick={() => rateTicket(null)}>
            I don&apos;t want
          </Button>
        </div>
      </div>
      {/* THANK YOU */}
      <div
        className={twMerge(
          `absolute bg-[rgba(0,0,0,0.75)] inset-[1px] z-[31]
          before:absolute before:w-4 before:h-4 before:bottom-0 before:right-0
          before:translate-x-[-50%] before:translate-y-[50%] before:rotate-45
          before:border-l-0 before:border-t-0 before:border-r before:border-b
           before:bg-[rgba(0,0,0,0.75)] before:z-[2] before:border-border-color/25
          flex justify-center items-center`,
          showThankYou
            ? "opacity-100 visible transition-all duration-300"
            : "opacity-0 invisible transition-all duration-300",
        )}>
        <div className="flex flex-col gap-y-2">
          <h1 className="text-center text-xl">Thank you</h1>
        </div>
      </div>
    </>
  )
}
