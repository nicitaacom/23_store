## Why I don't create separate components for Product.tsx

I want explain that I don't make separate components for Prodcut.tsx like ProductHeader.tsx / ProductFooter.tsx
Because its 3 different components

![edit product](https://i.imgur.com/JsnnKZW.png)

1. Here I made iamge smaller to improve UX because owner already know his image and I give product owner
   more space to edit product
2. I added icons to edit and speatated it into smaller components like OwnerProductForm.tsx so here it
   make sence but it not reusable anywhere else because it with icons and logic to edit product

![Product.tsx](https://i.imgur.com/ysU5kPE.png)

1. Here I made image enough big and leaved space for user to read title price description
   also size of title price increased for readability

![cart prodcut](https://i.imgur.com/v8AWraN.png)

1. Here I don't created sparated component also to impriove UX because I make accent on iamge
   and in modal cart product width smaller then Product.tsx that's why I need another but similar media queries

## Summary

Leave it as is without separated components for Product.tsx (exept edit product)
