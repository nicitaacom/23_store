import { stripe } from "@/libs/stripe"
import { AxiosResponse } from "axios"
import { NextResponse } from "next/server"

export type TAPICustomer = {
  session_id: string
}

export interface TAPICustomerData {
  customerEmail: string | null
}

export type TAPICustomerResponse<T = any> = AxiosResponse<TAPICustomerData>

export async function POST(req: Request) {
  const { session_id } = (await req.json()) as TAPICustomer

  // Get customer data (email) after payment with stripe
  const session = await stripe.checkout.sessions.retrieve(session_id)
  if (session.customer_details?.email) {
    return NextResponse.json({ customerEmail: session.customer_details?.email })
  } else {
    console.log(23, "no customer email")
    return NextResponse.json({ customerEmail: null })
  }
}
