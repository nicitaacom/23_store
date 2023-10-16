I create next functionality:

```md
!user cart_products[] and (user cart_products[something])
  cart_products[something]
```

```md
!user cart_products[somethingA] and (user cart_products[somethingB])
  cart_products[somethingB]
  when user log out then cart_products[somethingA] (from cookies {id and quantity} - fetch data)
```

```md
!user cart_products[something] and (user cart_products[])
  cart_products[something]
```