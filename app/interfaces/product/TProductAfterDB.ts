import { TProductDB } from "./TProductDB"

export type TProductAfterDB = TProductDB & {
  quantity: number
}
