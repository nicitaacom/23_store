"use client"

import { PayWithKlarnaButton } from "./components/PayWithClarmaButton"
import { PayWithMetamaskButton } from "./components/PayWithMetamaskButton"
import { PayWithPaypalButton } from "./components/PayWithPaypalButton"
import { PayWithStripeButton } from "./components/PayWithStripeButton"

export function PaymentButtons() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <PayWithMetamaskButton />
      <PayWithPaypalButton />
      <PayWithStripeButton />
      {/* <PayWithKlarnaButton />  */}
    </div>
  )
}
