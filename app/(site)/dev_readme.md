I create next functionality:

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
