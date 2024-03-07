# What in this docs?

- TypeScript in API routes
- Error handling in API routes
- Usage for each route
  - Usage for auth/login route
  - Usage for auth/recover route
  - Usage for auth/register route
  - Usage for auth/reset route
  - Usage for coinmarketcap route
  - Usage for create-checkout-session route
  - Usage for create-klarna-session route
  - Usage for create-paypal-session route
  - Usage for customer route
  - Usage for message/seen route
  - Usage for message/send route
  - Usage for payment/success route
  - Usage for products/add route
  - Usage for products/delete route
  - Usage for products/update route
  - Usage for send-email/check route
  - Usage for send-email/request-replanishment route
  - Usage for telegram route
  - Usage for tickets/close route
  - Usage for tickets/open route
  - Usage for tickets/rate route
  - Usage for verify-payment route

<br/>

# TypeScript in API routes

To avoid errors use types defined in API routes like this (`as TAPIMessages`)

### TypeScript in API routes (Server side)

`api/customer`

```ts
export type TAPICustomerRequest = {
  session_id: string
}

interface Response {
  customerEmail: string | null
}

export type TAPICustomerResponse = AxiosResponse<Response>

return NextResponse.json({ customerEmail: session.customer_details?.email })
```

### TypeScript in API routes (Client side)

```ts
const response: TAPICustomerResponse = await axios.post("/api/customer", {
  session_id: session_id,
} as TAPICustomerRequest)
```

<br/>

# Error handling in API routes

Please check best practice in `api/products/delete` route and throw errors like this in every API route

### Error handling in API routes (Server side)

```ts
console.log(23, "No productId", productId)
return new NextResponse(
  `Delete product error \n
                Path:/api/products/delete/route.ts \n
                Error message:\n please check that you passed productId`,
  { status: 400 },
)

//or

console.log(33, "Delete images from bucket error")
return new NextResponse(
  `Delete images from bucket \n
                Path:/api/products/delete/route.ts \n
                Error message:\n ${deleteFromBucketError.message}`,
  { status: 400 },
)

// for uncaught errors (in catch block) - use only that required
catch (error: any) {
    // Best practice to throw error like this
    if (error instanceof Stripe.errors.StripeError) {
      console.log(84, "DELETE_FOOD_ERROR\n (stripe) \n ", error.message)
      return new NextResponse(`/api/food/delete/route.ts error (stripe) \n ${error.message}`, {
        status: 500,
      })
    }
    if (error instanceof AxiosError) {
      console.log(84, "DELETE_FOOD_ERROR (supabase) \n", error)
      return new NextResponse(`/api/food/delete/route.ts error \n ${error}`, {
        status: 500,
      })
    }
    if (error instanceof Error) {
      console.log(90, "DELETE_FOOD_ERROR\n (supabase) \n", error.message)
      return new NextResponse(`/api/food/delete/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }
```

### Error handling in API routes (Client side)

```ts
try {
  await axios.post("/api/product/delete", { productId: id } as TAPIProductDelete)
} catch (error) {
  if (error instanceof AxiosError) {
    console.log(26, error.response?.data)
    toast.show("error", "Error deleting product", error.response?.data, 15000)
  }
}
```

## If error in headers (browser searchbar)

Usually its error that you got when user click on invalid or expired link
You not handle this that's why I created state in /error/page.tsx
Below you see example if you handle error (you know error message and why this error happened)

### On server

```ts
const error_description = encodeURIComponent("No user found after exchanging cookies for recovering")
return NextResponse.redirect(`${location.origin}/error?error_description=${error_description}`)
```

### On client

```tsx
const error_description = useSearchParams().get("error_description")

if (error_description === "No user found after exchanging cookies for registration") {
  return <ExchangeCookiesError message="No user found after exchanging cookies for registration" />
}
```

<br/>

# Usage for each route

### Usage for auth/login route

I use this route to:

1. Check is user with this email doesn't exist
2. Resend email if user try to login with email that already exists but not confirmed
3. Return info about providers to show error like 'You already have account with google - continue with google?'
4. Return username to set it in localstorage with zustand

### Usage for auth/recover route

I use this route to check is user with this email doesn't exist
(because I don't let to recover account with email that doesn't exist)

### Usage for api/auth/register route

I use this route to register user
In this route I:

1. Check if email is temp email (if true - throw errorA)
2. Check if user with this email exist (if ture && email !verified - throw errorB)
3. Check if user with this email exist (if ture && email verified - resend email then - throw errorC)
4. Sign up to (1 insert row in auth.users table) (2 to send verification email)
5. Insert row in 'public.users' 'public.users_cart' tables (if user exist throw error)

### Usage for api/auth/recover/route.ts

I use this route to recover password for user
I do it in API route becasue I want to trigger pusher when user change password and show
message like 'your password changed - stay safe'
Because actually recover password flow consist from 3 steps

1. You enter your email and click 'recover' button
2. You click on button in your email message you become
3. You change your password (and when you click 'change password' button I trigger pusher to show message)

### Usage for coinmarketcap route

I use this route to convert USD to ETH to show this price in metamask
This is API route because I use `NEXT_COINMARKETCAP_SECRET`

### Usage for create-checkout-session

I use this API route to create-checkout-session on stripe
This is API route because I use `NEXT_STRIPE_SECRET_KEY` in libs/stripe.ts
that I import in this route

### Usage for create-klarna-session

I use this API route to create checkout session with klarna
So user may pay with klarna - this doen't work

### Usage for create-paypal-session

To create paypal session with stripe
So user may pay with paypal through stripe

### Usage for customer route

I use this API route to return customer email after customer paid for somethig

### Usage for message/seen route

I use this API route to update messages in supabase in table 'messages' to seen:ture

### Usage for message/send route

I use this route to send message (doesn't matter for support or user side)

1. Insert message in table 'messages'
2. Update ticket in DB - last_message_body and is_open
3. Trigger 'messages:new' event in ticketId channel to show unseen messages on user side
4. Trigger 'tickets:update' event in 'ticekts' channel to show unseen messages in DesktopSidebar on support side

### Usage for payment/success route

I use this API route in case payment status success
In this case I need to substract on_stock from product.quantity
For that:

1. Get data about products from DB to substract on_stock - product.quantity
2. Subtract productQuantities from on_stock
3. Update rows in supabase

### Usage for products/add route

In this API route I:

1. Create product on stripe
2. Active this product if not active
3. Set price for this product

### Usage for products/delete route

In this API route I:

1. Archive product on stripe
2. Delete image from bucket
3. Delete product from 'products' table

### Usage for products/update route

In this API route I'm updating product based on passed data in this API roite
More info you find in commented lines in this API rote

### Usage for send-email/check route

In this API route I send email with check using `react-email` library
This library requires secret key - that's why I do it in API route

### Usage for send-email/request-replanishment route

I use this route to send email to product owner that somebody requested replanishment
Its not the best practice cause somebody may create bots and spam on product owner email
That's why its better to create in admin panel amount of requestes about replanishment

### Usage for telegram route

I use this route to send telegram message with bot

### Usage for tickets/close route

In this API route I close ticket and trigger event based on who closed ticket
And pass necessary data in channels

### Usage for tickets/open route

Only user may open ticket - so I insert new row in 'tickets' table
and trigger 'tickets:open' event in 'tickets' channel to immediately show
created ticket by user on support side

### Usage for tickets/rate route

In this API route I'm updating 'tickets' with rate:rate based on user's rate of this ticket

### Usage for verify-payment route

In this API route I'm verifying is payment valid to avoid user enter random session_id in browser searchbar
This API route usefull because it prevents user from creating order without payment
