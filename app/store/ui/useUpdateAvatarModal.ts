import { create } from "zustand"

type UpdateAvatarModalStore = {
  isOpen: boolean
  avatarUrl: string
  openModal: (avatarUrl: string) => void
  closeModal: () => void
}

export const useUpdateAvatarModal = create<UpdateAvatarModalStore>(set => ({
  isOpen: false,
  avatarUrl: "",
  openModal: avatarUrl =>
    set({
      isOpen: true,
      avatarUrl,
    }),
  closeModal: () =>
    set({
      isOpen: false,
      avatarUrl: "",
    }),
}))
