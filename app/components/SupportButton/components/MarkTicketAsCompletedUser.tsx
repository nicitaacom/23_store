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
import { useState } from "react"
import { useSupportDropdown } from "@/store/ui/supportDropdown"
import { useRouter } from "next/navigation"

interface MarkTicketAsCompletedUserProps {
  ticketId: string
  messagesLength: number
}

export function MarkTicketAsCompletedUser({ ticketId, messagesLength }: MarkTicketAsCompletedUserProps) {
  const router = useRouter()

  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const { closeDropdown } = useSupportDropdown()

  // It might be possible to do it with enum - I tried - it doesn't work
  const [isMarkTicketAsCompleted, setIsMarkTicketAsCompleted] = useState(false)
  const [isRateThisTicket, setIsRateThisTicket] = useState(false)
  const [isThankYou, setIsThankYou] = useState(false)

  const { isDarkMode } = useDarkMode()

  async function closeTicket() {
    setIsMarkTicketAsCompleted(false)
    setIsRateThisTicket(true)
    await axios.post("api/tickets/close", { ticketId: ticketId } as TAPITicketsClose)
  }

  async function rateTicket(ratingValue: number | null) {
    setRating(ratingValue)
    setTimeout(() => {
      // this timeout needed to improve UX
      setIsRateThisTicket(false)
    }, 150)

    if (ratingValue) {
      setIsThankYou(true)
      setTimeout(() => {
        setIsThankYou(false)
        closeDropdown()
        router.refresh()
      }, 1500)
    } else {
      closeDropdown()
      router.refresh()
    }
    await axios.post("/api/tickets/rate", { ticketId: ticketId, rate: ratingValue } as TAPITicketsRate)
  }

  const starts = [
    ...Array(5)
      .fill(0)
      .map((withoutItIuuse, index: number) => {
        const ratingValue = index + 1 //start not from 0 but from 1
        return (
          <label key={index}>
            <input
              style={{ display: "none" }}
              name="star"
              type="radio"
              value={ratingValue}
              onClick={() => rateTicket(ratingValue)}
            />
            <div
              className="cursor-pointer"
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(null)}>
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

  return (
    <>
      <div className="tooltip">
        <div
          className={twMerge(
            "p-2 hover:bg-success/10 duration-150 rounded-md w-fit cursor-pointer",
            messagesLength === 0 ? "cursor-not-allowed" : "cursor-pointer",
          )}>
          <Image
            src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
            alt="close ticket"
            width={32}
            height={32}
            onClick={() => messagesLength !== 0 && setIsMarkTicketAsCompleted(true)}
          />
        </div>
        <div className="tooltiptext whitespace-nowrap translate-x-[-90%]">I don&apos; let you close empty ticket</div>
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
          isMarkTicketAsCompleted
            ? "opacity-100 visible transition-all duration-300"
            : "opacity-0 invisible transition-all duration-300",
        )}>
        <div className="flex flex-col gap-y-2">
          <h1>Are you sure you want to close this ticket?</h1>
          <div className="flex flex-row gap-x-2 justify-center">
            <Button className="w-fit" variant="success-outline" onClick={closeTicket}>
              Yes
            </Button>
            <Button className="w-fit" variant="danger-outline" onClick={() => setIsMarkTicketAsCompleted(false)}>
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
          isRateThisTicket
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
          isThankYou
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