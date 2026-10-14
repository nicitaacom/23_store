"use client"

import { PayWithMetamaskButton } from "./components/PayWithMetamaskButton"
import { PayWithPaypalButton } from "./components/PayWithPaypalButton"
import { PayWithSolanaButton } from "./components/PayWithSolanaButton"
import { PayWithStripeButton } from "./components/PayWithStripeButton"

// http://localhost:6006/?path=/story/commerce-checkout--cart
export function PaymentButtons({ deliveryAddress }: { deliveryAddress?: API.ProductsCheckoutDeliveryAddress }) {
  return (
    <div className="flex flex-col gap-3">
      <PayWithMetamaskButton />
      <PayWithSolanaButton />
      <PayWithPaypalButton />
      <PayWithStripeButton deliveryAddress={deliveryAddress} />
      {/* <PayWithKlarnaButton /> */}
    </div>
  )
}
