import { stripe } from "@/libs/stripe"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { NextRequest, NextResponse } from "next/server"

type TRequest = {
  id: string
}

export async function POST(request: NextRequest) {
  const { id }: TRequest = await request.json()
  const supabase = supabaseServerAction()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Check owner and get image urls
    const { data, error: deleteProductError } = await supabase
      .from("products")
      .select("img_url, owner_id")
      .eq("id", id)
      .single()
    if (deleteProductError)
      throw new Error(
        `Selecting img_url error \n Path:/api/products/delete/route.ts \n Error message:\n ${deleteProductError.message}`,
      )

    if (data?.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. Archive product on Stripe
    const deleteResponse = await stripe.products.update(id, {
      active: false,
    })

    // 3. Delete image from bucket
    if (data?.img_url) {
      // 3.1 Get all the parts after the last occurrence of the second part of the URL (last two parts of URL https://smth/part1/part2)
      const imageUrls = data.img_url.map(url => {
        const parts = url.split("/")
        const lastTwoParts = parts.slice(-2).join("/")
        return lastTwoParts
      })
      // 3.2 Delete image from bucket based on selected URLs
      const { error: deleteFromBucketError } = await supabase.storage.from("public-images").remove(imageUrls)
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
      console.log(48, "Delete images from bucket error - no iamges in 'products' found")
      return new NextResponse(
        `Delete images from bucket \n
                Path:/api/products/delete/route.ts \n 
                Error message:\n No img_url found in 'products' ${data.img_url}`,
        { status: 400 },
      )
    }

    // 4. Delete product from 'products' table
    const { error: deleteError } = await supabase.from("products").delete().eq("id", id)
    if (deleteError)
      // SOLID - O (OCP) - Open/Closed prinicpe - open for expanding - closed for modifications
      throw new Error(
        `Delete from 'products' table \n Path:/api/products/delete/route.ts \n Error message: \n ${{ deleteError }}`,
      )
    return NextResponse.json(deleteResponse)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown delete product error"
    console.log("DELETE_PRODUCT_ERROR\n", errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
