import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIPaymentSuccess = {
  productIds: string[]
}

export async function POST(req: Request) {
  const { productIds } = (await req.json()) as TAPIPaymentSuccess

  try {
    // 1. Get data about products from DB to substract on_stock - product.quantity
    const { data: products, error: products_error } = await supabaseAdmin
      .from("products")
      .select("on_stock")
      .in("id", productIds)
    if (products_error) {
      console.log(87, "Select product in DB error")
      return new NextResponse(
        `Select product in DB \n
                Path:/api/payment/success/route.ts \n 
                Error message:\n ${products_error.message}`,
        { status: 400 },
      )
    }
    console.log(22, "products - ", products)
  } catch (error) {
    if (error instanceof Error) {
      console.log(29, "SUBSTRACT_PRODUCTS_ON_STOCK_ERROR\n  \n", error.message)
      return new NextResponse(`/api/payment/success/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }

  return NextResponse.json({ status: 200 })
}
