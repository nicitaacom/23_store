import { stripe } from "@/libs/stripe"
import axios from "axios"
import { NextResponse } from "next/server"

type TRequest = {
  productId: string
  images: string[]
}

export async function POST(req: Request) {
  const body: TRequest = await req.json()

  const images = body.images
  const productId = body.productId
  console.log(14, "productId - ", productId)

  try {
    //Create update on Stripe https://stripe.com/docs/api/products/update
    const productResponse = await stripe.products.update(productId, { images: images })

    //Active product if it not active
    if (!productResponse.active) {
      await axios.put(
        `https://api.stripe.com/v1/products/${productResponse.id}`,
        {
          active: true,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      )
    }

    return NextResponse.json(productResponse, { status: 200 })
  } catch (error: any) {
    console.log(13, "UPDATE_PRODUCT_ERROR\n", error.response.data)
    return new NextResponse(`/api/products/update/route.ts error (check termianl) ${error.response.data}`, {
      status: 500,
    })
  }
}
