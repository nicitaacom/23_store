import axios from "axios"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  // const images: string[] = body.images
  const title: string = body.title
  const subTitle: string = body.subTitle
  const price: number = body.price

  try {
    //Create product on Stripe https://dashboard.stripe.com/test/products/create
    const productResponse = await axios.post(
      "https://api.stripe.com/v1/products",
      {
        name: title,
        description: subTitle,
        type: "good",
        // images: images,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )
    //Active product if it not active
    if (!productResponse.data.active) {
      await axios.put(
        `https://api.stripe.com/v1/products/${productResponse.data.id}`,
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

    // Create price for the product
    const priceResponse = await axios.post(
      "https://api.stripe.com/v1/prices",
      {
        product: productResponse.data.id,
        unit_amount: price * 100, // Convert to cents
        currency: "usd",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )
    return NextResponse.json(priceResponse.data, { status: 200 })
  } catch (error: any) {
    console.log(13, "CREATE_PRODUCT_ERROR\n", error.response.data)
    return new NextResponse(`/api/products/add/route.ts error (check termianl) ${error.response.data}`, { status: 500 })
  }
}
