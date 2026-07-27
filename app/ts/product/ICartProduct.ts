export interface ICartProduct {
  id: string
  quantity: number
  variantId?: string | null
  // Set when the buyer personalized this line - points at a 23_personalized_designs row.
  designId?: string | null
}
