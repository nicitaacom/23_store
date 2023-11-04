import Stripe from "stripe"

export interface Product {
  id: string
  active?: boolean
  name?: string
  description?: string
  image?: string
  metadata?: Stripe.Metadata
}

export interface Price {
  id: string
  product_id?: string
  active?: boolean
  description?: string
  unit_amount?: number
  currency?: string
  type?: Stripe.Price.Type
  interval?: Stripe.Price.Recurring.Interval
  interval_count?: number
  trial_period_days?: number | null
  metadata?: Stripe.Metadata
  products?: Product
}
