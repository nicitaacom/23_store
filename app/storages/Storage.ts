import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"

export abstract class Storage {
  abstract saveProducts(cartProducts: TRecordCartProduct): void
  abstract getProducts(): Promise<TRecordCartProduct>
}
