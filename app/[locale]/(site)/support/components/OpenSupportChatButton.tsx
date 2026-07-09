"use client"

import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"

export function OpenSupportChatButton() {
  const t = useScopedI18n("support")
  const { openDropdown } = useSupportDropdown()

  return (
    <Button className="mt-auto" variant="default" onClick={openDropdown}>
      {t("open_live_chat")}
    </Button>
  )
}
