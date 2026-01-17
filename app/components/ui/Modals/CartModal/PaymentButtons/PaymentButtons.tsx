"use client"

import { PayWithKlarnaButton } from "./components/PayWithClarmaButton"
import { PayWithMetamaskButton } from "./components/PayWithMetamaskButton"
import { PayWithPaypalButton } from "./components/PayWithPaypalButton"
import { PayWithStripeButton } from "./components/PayWithStripeButton"

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
