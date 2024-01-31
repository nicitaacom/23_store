import { create } from "zustand"

export type TWallet = {
  accounts: never[]
  balance: string
  chainId: string
}

type DoYouWantRecieveCheckModalStore = {
  wallet: TWallet
  setWallet: (wallet: Partial<TWallet>) => void
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}
const initialState = { accounts: [], balance: "", chainId: "" }

export const useDoYouWantRecieveCheckModal = create<DoYouWantRecieveCheckModalStore>(set => ({
  wallet: initialState,
  setWallet: wallet =>
    set(state => ({
      wallet: { ...state.wallet, ...wallet },
    })),
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}))
