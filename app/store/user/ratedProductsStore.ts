import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

// Star rating this user gave each product (productId -> 1-5). Kept client-side (localStorage) so a
// user rates a product once; the global average lives in 23_products (rating_sum / rating_count).
interface RatedProductsStore {
  ratingByProductId: Record<string, number>
  setProductRating: (productId: string, stars: number) => void
}

type SetState = (fn: (prevState: RatedProductsStore) => RatedProductsStore) => void

function ratedProductsStore(set: SetState): RatedProductsStore {
  return {
    ratingByProductId: {},
    setProductRating(productId: string, stars: number) {
      set(state => ({
        ...state,
        ratingByProductId: { ...state.ratingByProductId, [productId]: stars },
      }))
    },
  }
}

const useRatedProductsStore = create(devtools(persist(ratedProductsStore, { name: "ratedProducts" })))

export default useRatedProductsStore
