import { NextResponse } from "next/server"

import { stripe } from "@/libs/stripe"

export type TAPICustomer = {
  session_id: string
}

export interface IAPICustomerData {
  customerEmail: string | null
}

export async function POST(req: Request) {
  const { session_id } = (await req.json()) as TAPICustomer

  if (!session_id) {
    console.log(17, "No session_id found")
    return new NextResponse(
      `get customer email from session_id \n
                Path:/api/customer/route.ts \n
                Error message:\n No session_id found - check that you passed session_id`,
      { status: 400 },
    )
  }

  // Get customer data (email) after payment with stripe
  const session = await stripe.checkout.sessions.retrieve(session_id)
  if (session.customer_details?.email) {
    return NextResponse.json({ customerEmail: session.customer_details?.email })
  } else {
    console.log(31, "no customer email")
    return NextResponse.json({ customerEmail: null })
  }
}
