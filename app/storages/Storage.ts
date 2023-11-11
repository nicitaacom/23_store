import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"

export abstract class Storage {
  abstract saveProducts(cartProducts: TRecordCartProduct): void
  abstract getProducts(): Promise<TRecordCartProduct>
}
