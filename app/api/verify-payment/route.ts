import { stripe } from "@/libs/stripe"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export type TAPIVerifyPayment = {
  session_id: string
}

export type TAPIVerifyPaymentResponse = {
  data: {
    valid: boolean
  }
}

export async function POST(req: Request) {
  const { session_id } = (await req.json()) as TAPIVerifyPayment

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id as string)

    if (session.payment_status === "paid") {
      return NextResponse.json({ valid: true }, { status: 200 })
    } else {
      return NextResponse.json({ valid: false }, { status: 400 })
    }
  } catch (error) {
    // Best practice to throw error like this
    if (error instanceof Stripe.errors.StripeError) {
      console.log(23, "VERIFY_PAYMENT_ERROR\n (stripe) \n ", error.message)
      return new NextResponse(`/api/product/delete/route.ts error (stripe) \n ${error.message}`, {
        status: 500,
      })
    }
    if (error instanceof Error) {
      console.log(29, "VERIFY_PAYMENT_ERROR\n (unknown) \n", error.message)
      return new NextResponse(`/api/product/delete/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }
}
