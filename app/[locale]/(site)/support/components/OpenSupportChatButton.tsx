"use client"

import { useScopedI18n } from "@/locales/client"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { Button } from "@/components/ui"

// http://localhost:6006/?path=/story/navigation-appshell--sign-in
export function OpenSupportChatButton() {
  const t = useScopedI18n("support")
  const { openDropdown } = useSupportDropdown()

  return (
    <Button className="mt-auto min-h-[44px]" data-cy="support-page-open-chat" variant="default" onClick={openDropdown}>
      {t("open_live_chat")}
    </Button>
  )
}
