"use client"

import { PayWithMetamaskButton } from "./components/PayWithMetamaskButton"
import { PayWithPaypalButton } from "./components/PayWithPaypalButton"
import { PayWithStripeButton } from "./components/PayWithStripeButton"

// http://localhost:6006/?path=/story/commerce-checkout--cart
export function PaymentButtons() {
  return (
    <div className="flex flex-col gap-3">
      <PayWithMetamaskButton />
      <PayWithPaypalButton />
      <PayWithStripeButton />
      {/* <PayWithKlarnaButton /> */}
    </div>
  )
}
