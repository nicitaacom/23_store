# Important

To avoid errors use types defined in API routes like this (`as TAPIMessages`)

### Server side

`api/customer`

```ts
export type TAPICustomer = {
  session_id: string
}

export interface TAPICustomerData {
  customerEmail: string | null
}

export type TAPICustomerResponse<T = any> = AxiosResponse<TAPICustomerData>

return NextResponse.json({ customerEmail: session.customer_details?.email })
```

### Client side

```ts
const response: TAPICustomerResponse = await axios.post("/api/customer", {
  session_id: session_id,
} as TAPICustomer)
```

## Errors handling

Please check best practice in `api/products/delete` route and throw errors like this in every API route

### Server side

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

### Client side

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

## Usage for coinmarketcap route

I use this route to convert USD to ETH to show this price in metamask
This is API route because I use `NEXT_COINMARKETCAP_SECRET`

## Usage for create-checkout-session

I use this API route to create-checkout-session on stripe
This is API route because I use `NEXT_STRIPE_SECRET_KEY` in libs/stripe.ts
that I import in this route

## Usage for email

I use this route to send email with resend
This is API route because I use `NEXT_RESEND_SECRET`

## Usage for products

I use this route to add/update/delete product

## Usage for api/auth/login/route.ts

I created this route to safely (with `supabaseAdmin`) check if user with this email exist
(if exist - throw error) and to return providers if user exist - to throw error like
'You already have accouth with google - continue with google?'

## Usage for api/auth/recover/route.ts

I use this route to recover password for user
I do it in API route becasue I want to trigger pusher when user change password and show
message like 'your password changed - stay safe'
Because actually recover password flow consist from 3 steps

1. You enter your email and click 'recover' button
2. You click on button in your email message you become
3. You change your password (and when you click 'change password' button I trigger pusher to show message)

## Usage for api/auth/register/route.ts

I use this route to register user
In this route I:

1. Check if email is temp email (if true - throw errorA)
2. Check if user with this email exist (if ture && email !verified - throw errorB)
3. Check if user with this email exist (if ture && email verified - resend email then - throw errorC)
4. Sign up to (1 insert row in auth.users table) (2 to send verification email)
5. Insert row in 'public.users' 'public.users_cart' tables (if user exist throw error)

## Returning errors

### On server

```ts
  } catch (error: any) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
```

### On client

```tsx
 } catch (error) {
      if (error instanceof Error && error.message === "New password should be different from the old password.") {
        displayResponseMessage(<p className="text-danger">Its already your password - enter new one</p>)
        //This is required to show custom error message (check api/auth/recover/route.ts)
      } else if (error instanceof AxiosError) {
        displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
      } else {
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

```ts
  const error_description = useSearchParams().get("error_description")

if (error_description === "No user found after exchanging cookies for registration") {
    return <ExchangeCookiesError message="No user found after exchanging cookies for registration" />
  }
```
