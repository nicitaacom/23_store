## I created next functionality for user cart:

```md
!user cartProducts[] and (when user cart_products[something])
cart_products[something]
```

```md
!user cartProducts[somethingA] and (when user cart_products[somethingB])
cart_products[somethingB]
when user log out then cart_products[somethingA] (from cookies {id and quantity} - fetch data)
```

```md
!user cartProducts[something] and (when user cart_products[])
cart_products[something]
```

## Usage for de pl ru uk routes

I did this routes to create internatiolization with `i18n`
I don't use this library because it has issues and I got error during build process
https://github.com/i18next/next-i18next/discussions/2223
But now I figured it out and use next-international instead of "i18n" for i18n

## Usage for payment route

After a successful checkout, the payment route runs these receipt steps in order:

1. Read the customer email from the verified checkout session.
2. Wait for cart initialization, then select the purchased product data.
3. Render the receipt email only after both customer and product data exist.
4. Verify the session is paid, send the receipt, record purchased products, and subtract stock.
5. Clear the cart and redirect to `/`.

Development shows `Test` before the successful-payment heading. Production uses only the translated
heading.

Keep product selection inside `usePaymentSteps`. Do not add another `useEffect` that changes the step
when cart initialization finishes because that skips the customer and product steps.

## Usage for search route

I use this route when user enter something in search bar in top center screen or in CtrlK modal
