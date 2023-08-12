import { create } from 'zustand'

interface HamburgerMenuStore {
  isOpen:boolean
  onOpen:() => void
  onClose:() => void
}

const useHamburgerMenu = create<HamburgerMenuStore>((set) => ({
  isOpen:false,
  onOpen:() => set({isOpen:true}),
  onClose:() => set({isOpen:false})
}))

export default useHamburgerMenu