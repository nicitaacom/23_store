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
I don't use this library because it has issues and I got error durign build process
https://github.com/i18next/next-i18next/discussions/2223

## Usage for payment route

After user payed for something I:

1. Redirect user to this route and show him 'green-checkmark.gif'
2. Clear user's cart
3. Send check about payment to user's email
4. Redirect user back to / after 5 seconds with `router.replace('/')`

## Usage for search route

I use this route when user enter something in search bar in top center screen or in CtrlK modal
