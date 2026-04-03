import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface LikedProductsStore {
  likedProductIds: string[]
  toggleProductLike: (productId: string) => void
}

type SetState = (fn: (prevState: LikedProductsStore) => LikedProductsStore) => void

const likedProductsStore = (set: SetState): LikedProductsStore => ({
  likedProductIds: [],
  toggleProductLike(productId: string) {
    set(state => ({
      ...state,
      likedProductIds: state.likedProductIds.includes(productId)
        ? state.likedProductIds.filter(id => id !== productId)
        : [...state.likedProductIds, productId],
    }))
  },
})

const useLikedProductsStore = create(devtools(persist(likedProductsStore, { name: "likedProducts" })))

export default useLikedProductsStore
