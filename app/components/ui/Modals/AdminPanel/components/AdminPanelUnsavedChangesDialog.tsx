"use client"

import { AreYouSureModalContainer } from "../../ModalContainers/AreYouSureModalContainer"
import { useI18n } from "@/locales/client"

interface AdminPanelUnsavedChangesDialogProps {
  isOpen: boolean
  onDiscard: () => void
  onKeepEditing: () => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--unsaved-changes
export function AdminPanelUnsavedChangesDialog({
  isOpen,
  onDiscard,
  onKeepEditing,
}: AdminPanelUnsavedChangesDialogProps) {
  const t = useI18n()

  return (
    <AreYouSureModalContainer
      isOpen={isOpen}
      label={t("modal.admin_panel.unsaved_title")}
      subTitle={t("modal.admin_panel.unsaved_subtitle")}
      primaryButtonAction={onDiscard}
      primaryButtonLabel={t("modal.admin_panel.discard")}
      primaryButtonVariant="danger"
      secondaryButtonAction={onKeepEditing}
      secondaryButtonLabel={t("modal.admin_panel.keep_editing")}
    />
  )
}
