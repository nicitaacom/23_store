import { stripe } from "@/libs/stripe"
import supabaseServerAction from "@/libs/supabaseServerAction"
import { NextRequest, NextResponse } from "next/server"

type TRequest = {
  id: string
}

export async function POST(request: NextRequest) {
  const { id }: TRequest = await request.json()

  try {
    // Delete product on Stripe https://stripe.com/docs/api/products/delete
    // https://stackoverflow.com/questions/72890840 - archive instead
    const deleteResponse = await stripe.products.update(id, {
      active: false,
    })

    //delete product from bucket
    const { data, error: deleteProductError } = await supabaseServerAction()
      .from("products")
      .select("img_url")
      .eq("id", id)
      .single()
    if (deleteProductError)
      throw new Error(
        `delete product from bucket \n Path:/api/products/delete/route.ts \n Error message:\n ${deleteProductError.message}`,
      )

    if (data?.img_url) {
      //get all the parts after the last occurrence of the second part of the URL
      const imageUrls = data.img_url.map(url => {
        const parts = url.split("/")
        const lastTwoParts = parts.slice(-2).join("/")
        return lastTwoParts
      })
      const { error: deleteFromBucketError } = await supabaseServerAction().storage.from("public").remove(imageUrls)
      if (deleteFromBucketError) {
        throw new Error(
          `Delete images from bucket \n Path:/api/products/delete/route.ts \n Error message:\n ${deleteFromBucketError.message}`,
        )
      }
    } else {
      throw new Error(`Delete images from bucket error - no iamges in bucket found:\n
     data.img_url - ${data.img_url}`)
    }

    //delte product from 'products' table
    const { error: deleteError } = await supabaseServerAction().from("products").delete().eq("id", id)
    if (deleteError)
      throw new Error(
        `Delete from 'products' table \n Path:/api/products/delete/route.ts \n Error message: \n ${{ deleteError }}`,
      )
    return NextResponse.json(deleteResponse)
  } catch (error: any) {
    console.log(13, "DELETE_PRODUCT_ERROR\n", error.response.data)
    return new NextResponse(`/api/products/delete/route.ts error (check termianl) ${error.response.data}`, {
      status: 500,
    })
  }
}
