"use client"

import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"

export function OpenSupportChatButton() {
  const t = useScopedI18n("support")
  const { openDropdown } = useSupportDropdown()

  return (
    <Button className="mt-auto" variant="default" onClick={openDropdown}>
      {t("open_live_chat")}
    </Button>
  )
}
