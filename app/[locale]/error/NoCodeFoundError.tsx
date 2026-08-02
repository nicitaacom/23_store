import { useState } from "react"
import Image from "next/image"
import { MdCheck, MdOutlineEmail } from "react-icons/md"

import { BackToMainButton } from "./components/BackToMainButton"
import { reportErrorToSupport } from "@/functions/support/reportErrorToSupport"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useI18n } from "@/locales/client"
import { Button } from "@/components/ui"

type TReportStatus = "idle" | "sending" | "sent" | "failed"

// http://localhost:6006/?path=/story/authentication-authpieces--headers-per-variant
export function NoCodeFoundError({ message }: { message?: string }) {
  const { isDarkMode } = useDarkModeStore()
  const tGlobal = useI18n()
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  const errorMessage = message ?? "No code found to exchange cookies for session"
  const [reportStatus, setReportStatus] = useState<TReportStatus>("idle")

  async function handleReportToSupport() {
    setReportStatus("sending")
    const reportErrorToSupportResp = await reportErrorToSupport(tGlobal, errorMessage)
    setReportStatus(reportErrorToSupportResp.success ? "sent" : "failed")
  }

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <div
        className={`w-full h-[35vh] relative ${isDarkMode ? "bg-[#0a6624]" : "bg-[#20e959]"} flex justify-center items-center`}>
        <Image
          className="w-[200px] laptop:w-[250px] desktop:w-[300px]"
          src={
            isDarkMode
              ? "/errors/no-code-found-to-exchange-cookies-for-session-icon-dark.png"
              : "/errors/no-code-found-to-exchange-cookies-for-session-icon-light.png"
          }
          alt="no-code-found"
          width={300}
          height={226}
        />
      </div>
      <p className="text-danger text-center">{errorMessage}</p>
      <p className="text-center">You might pressed &quot;Cancel&quot; button when continue with google</p>
      <Button
        variant="link"
        onClick={handleReportToSupport}
        disabled={reportStatus === "sent"}
        loading={reportStatus === "sending"}
        loadingText="Sending report..."
        rightIcon={reportStatus === "sent" ? <MdCheck className="text-sm" /> : <MdOutlineEmail className="text-sm" />}>
        {reportStatus === "sent" ? "Report sent - thank you" : "Report to support"}
      </Button>
      {reportStatus === "failed" && (
        <p className="text-xs text-danger">Couldn&apos;t send automatically. Please email {supportEmail} with what happened.</p>
      )}
      <BackToMainButton />
    </div>
  )
}
