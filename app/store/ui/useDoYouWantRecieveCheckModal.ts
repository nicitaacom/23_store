import { create } from "zustand"

export type TWallet = {
  accounts: string[]
  balance: string
  chainId: string
  secret?: number[]
}

type DoYouWantRecieveCheckModalStore = {
  wallet: TWallet
  recipientAddress: string | null
  setWallet: (wallet: Partial<TWallet>) => void
  isOpen: boolean
  openModal: (recipientAddress: string) => void
  closeModal: () => void
}
const initialState = { accounts: [], balance: "", chainId: "" }

export const useDoYouWantRecieveCheckModal = create<DoYouWantRecieveCheckModalStore>(set => ({
  wallet: initialState,
  recipientAddress: null,
  setWallet: wallet =>
    set(state => ({
      wallet: { ...state.wallet, ...wallet },
    })),
  isOpen: false,
  openModal: recipientAddress => set({ isOpen: true, recipientAddress }),
  closeModal: () => set({ isOpen: false }),
}))
