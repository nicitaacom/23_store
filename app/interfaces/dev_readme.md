### Interfaces

`IInterface` - interface that has export and uses 2+ times in project
`InterfaceProps` - interface that use in props
`TType` - type of some interface (it some data from exising interface - provide example)
`types_db` - file that related to dependency (don't start it with I or T)

![interfaces](https://i.imgur.com/3B1TAsn.png)

### Usage for ICartProduct.ts

This product that I add in cart in localStorage or DB
Check logic that I have for store in `(site)/dev_readme.md`

### Usage for TProductDB.ts

I use this interface to get TypeScript intellisense
This type stored in DB without quantity

### Usage for TProductAfterDB.ts

I use this interface to get TypeScript intellisense
This is TProductDB type with added quantity

### Usage for IFormDataAddProduct.ts

I use this in admin panel when you want to create some product

### Usage for IFormDataMessage.ts

I use this for react-hook-form for `/support/tickets` route

### Usage for IMessage.ts

I use this type to get TypeScript intellisense
This type for message type

### Usage for IProduct.ts

I use this type for TypeScript intallisense and for my me so I understand which this product is
In my cart (just with id and quantity) - I store this in LS or DB - check `(site)/dev_reamde.md`
From DB (without quantity) - I get this and check product quantity in cart ? cartQuantity : 0
Product type (with quantitiy) - I display it on / route

### Usage for ITicket.ts

I use this type for ticket that you see in `DesktopSidebar.tsx` on `support/tickets` router

### Usage for TRecordCartProduct.ts

I use this type to save this in localstore - I mean I save product with that type in localstorage
Thank you Джафарр for explanations
As I remember he said that user may modify something if save in another type and also this product may be deleted by owner
that's why you need to store just id and quantity

### Usage for types_db.ts

This file generated with `pnpm update-types` command from terminal
This file required to get TypeScript intellisense when you so something with supabase
e.g from('here you get autocomplete')
