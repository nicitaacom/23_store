"use client"

import Image from "next/image"
import axios from "axios"
import { twMerge } from "tailwind-merge"
import { CiStar } from "react-icons/ci"

import { TAPITicketsClose } from "@/api/tickets/close/route"
import { usePleaseRateTicket } from "@/store/ui/pleaseRateTicket"
import { useAreYouSureMarkTicketAsCompletedUser } from "@/store/ui/areYouSureMarkTicketAsCompletedUser"
import useDarkMode from "@/store/ui/darkModeStore"
import { Button } from "@/components/ui"

export function MarkTicketAsCompletedUser({ ticketId }: { ticketId: string }) {
  const { isDarkMode } = useDarkMode()

  const areYouSureMarkTicketAsCompletedUser = useAreYouSureMarkTicketAsCompletedUser()
  const pleaseRateTicket = usePleaseRateTicket()

  async function closeTicket() {
    // await axios.post("api/tickets/close", { ticketId: ticketId } as TAPITicketsClose)
    areYouSureMarkTicketAsCompletedUser.close()
    pleaseRateTicket.open()
  }

  return (
    <div className="p-2 hover:bg-success/10 duration-150 rounded-md w-fit cursor-pointer" role="button">
      <Image
        src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
        alt="close ticket"
        width={32}
        height={32}
        onClick={areYouSureMarkTicketAsCompletedUser.open}
      />

      <div
        className={twMerge(
          `absolute bg-[rgba(0,0,0,0.75)] inset-[1px] z-[21]
          before:absolute before:w-4 before:h-4 before:bottom-0 before:right-0
          before:translate-x-[-50%] before:translate-y-[50%] before:rotate-45
          before:border-l-0 before:border-t-0 before:border-r before:border-b
           before:bg-[rgba(0,0,0,0.75)] before:z-[2] before:border-border-color/25
          flex justify-center items-center`,
          areYouSureMarkTicketAsCompletedUser.isOpen
            ? "opacity-100 visible transition-all duration-300"
            : "opacity-0 invisible transition-all duration-300",
        )}>
        <div className="flex flex-col gap-y-2">
          <h1>Are you sure you want to close this ticket?</h1>
          <div className="flex flex-row gap-x-2 justify-center">
            <Button className="w-fit" variant="success-outline" onClick={closeTicket}>
              Yes
            </Button>
            <Button className="w-fit" variant="danger-outline" onClick={areYouSureMarkTicketAsCompletedUser.close}>
              No
            </Button>
          </div>
        </div>
      </div>
      <div
        className={twMerge(
          `absolute bg-[rgba(0,0,0,0.75)] inset-[1px] z-[31]
          before:absolute before:w-4 before:h-4 before:bottom-0 before:right-0
          before:translate-x-[-50%] before:translate-y-[50%] before:rotate-45
          before:border-l-0 before:border-t-0 before:border-r before:border-b
           before:bg-[rgba(0,0,0,0.75)] before:z-[2] before:border-border-color/25
          flex justify-center items-center`,
          pleaseRateTicket.isOpen
            ? "opacity-100 visible transition-all duration-300"
            : "opacity-0 invisible transition-all duration-300",
        )}>
        <div className="flex flex-col gap-y-2">
          <h1>Please rate this ticket</h1>
          <div className="flex flex-row gap-x-2 justify-center">
            {/* TODO - UI+logic for rate */}
            <CiStar className="hover:bg-[#E49B0F]" />
            <CiStar className="hover:bg-[#E49B0F]" />
            <CiStar className="hover:bg-[#E49B0F]" />
            <CiStar className="hover:bg-[#E49B0F]" />
            <CiStar className="hover:bg-[#E49B0F]" />
          </div>
          <Button variant="default-outline" onClick={pleaseRateTicket.close}>
            I don&apos; want
          </Button>
        </div>
      </div>
    </div>
  )
}
