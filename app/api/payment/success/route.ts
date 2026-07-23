import { NextResponse } from "next/server"

import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"

export type TAPIPaymentSuccess = {
  cartProducts: TRecordCartProduct
}

export async function POST(req: Request) {
  const { cartProducts } = (await req.json()) as TAPIPaymentSuccess
  // productIds = Object.keys(cartProducts), productQuantities = Object.values(cartProducts).map(p => p.quantity)

  try {
    // 1. Get data about products from DB to substract on_stock - product.quantity
    // const { data: products, error: products_error } = await supabaseAdmin
    //   .from("products")
    //   .select("on_stock")
    //   .in("id", productIds)
    // if (products_error) {
    //   console.log(21, "Select product in DB error")
    //   return new NextResponse(
    //     `Select product in DB \n
    //             Path:/api/payment/success/route.ts \n
    //             Error message:\n ${products_error.message}`,
    //     { status: 400 },
    //   )
    // }

    // 2. Subtract productQuantities from on_stock
    // const substracted_on_stock = products.map((product, index) => product.on_stock - productQuantities[index])

    // 3. Update rows in supabase
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept to preserve vision, see comments below
    for (const [index, [id, product]] of Object.entries(cartProducts).entries()) {
      // const updatedOnStock = substracted_on_stock[index]
      // no longer need to update on stock but I comment this to keep vision in code so in the future
      // if on_stock in back I will now that it should be here
      // const { error: update_error } = await supabaseAdmin
      //   .from("products")
      //   .update({ on_stock: updatedOnStock })
      //   .eq("id", id)
      // if (update_error) {
      //   console.log(`Update product with id ${id} in DB error: ${update_error.message}`)
      //   return new NextResponse(`Update product with id ${id} in DB error`, { status: 400 })
      // }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(49, "SUBSTRACT_PRODUCTS_ON_STOCK_ERROR\n  \n", error.message)
      return new NextResponse(`/api/payment/success/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }

  return NextResponse.json({ status: 200 })
}
