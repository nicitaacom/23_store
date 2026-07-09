"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FiTrash2 } from "react-icons/fi"

import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useScopedI18n } from "@/locales/client"
import { Button } from "@/components/ui"

// Closes an empty/unlinked ticket (row is open but has no valid messages) so it stops showing in the
// sidebar. closeTicket fires tickets:closeBySupport, which the sidebar already listens to and removes the row.
export function RemoveStaleTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const t = useScopedI18n("support")
  const [isRemoving, setIsRemoving] = useState(false)

  async function handleRemove() {
    setIsRemoving(true)
    await supportSDK.closeTicket({ ticketId, closedBy: "support" })
    router.push("/support/tickets")
  }

  return (
    <Button
      className="mt-4 self-center border-danger/30 text-danger hover:bg-danger/10"
      variant="danger-outline"
      leftIcon={<FiTrash2 size={15} />}
      loading={isRemoving}
      onClick={handleRemove}
      type="button">
      {t("remove_from_list")}
    </Button>
  )
}
