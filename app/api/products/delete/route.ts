import { stripe } from "@/libs/stripe"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
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
        `Delete product from bucket \n Path:/api/products/delete/route.ts \n Error message:\n ${deleteProductError.message}`,
      )

    if (data?.img_url) {
      //get all the parts after the last occurrence of the second part of the URL (last two parts of URL https://smth/part1/part2)
      const imageUrls = data.img_url.map(url => {
        const parts = url.split("/")
        const lastTwoParts = parts.slice(-2).join("/")
        return lastTwoParts
      })
      const { error: deleteFromBucketError } = await supabaseServerAction().storage.from("public").remove(imageUrls)
      if (deleteFromBucketError) {
        console.log(39, "Delete images from bucket error")
        return new NextResponse(
          `Delete images from bucket \n
                Path:/api/products/delete/route.ts \n 
                Error message:\n ${deleteFromBucketError.message}`,
          { status: 400 },
        )
      }
    } else {
      console.log(48, "Delete images from bucket error - no iamges in bucket found")
      return new NextResponse(
        `Delete images from bucket \n
                Path:/api/products/delete/route.ts \n 
                Error message:\n No images found in bucket ${data.img_url}`,
        { status: 400 },
      )
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
