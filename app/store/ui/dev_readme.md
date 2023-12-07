## Usage for areYouSureClearCartModal.ts

I use this global store to show modal `AreYouSureClearCartModal`
I use this file in this modal `CartModal.tsx` and in `AreYouSureClearCartModal.tsx`

## Usage for areYouSureDeleteProductModal.ts

I use this global store to show modal `areYouSureDeleteProductModal`
I use this file in this modal `DeleteProductHeader.tsx` and in `AreYouSureDeleteProductModal.tsx`
In `DeleteProductHeader` I pass in props:

1. id - to set id of product to delete - I use it to send API call

```ts
await axios.post("/api/products/delete", { id: areYouSureDeleteProductModal.id })
2. title - to show name of the product to delete like 'Are you sure you want to delete `${title}`?'
```

## Usage for areYouSureMarkTicketAsCompletedSupportModal.ts

I use this global store to show modal `areYouSureMarkTicketAsCompletedSupportModal`
I know the name is long - it exactly describe the purpose of this file
I use this store in `AreYouSureMarkTicketAsCompletedSupportModal.tsx` and in `MarkTicketAsCompletedSupport.tsx`
`MarkTicketAsCompletedSupport.tsx` - its icon support click to mark ticket as completed

## Usage for avatarDropdown.ts

I use this global store to open/close/toggle avarar dropdown that you see in top right corner
This comes with hook `useAvatarDropdownClose.ts`

## Usage for contactDropdown.ts

I use this file to show contact dropdown that you see in top right corner when click on phone icon
This comes with hook `useContactDropdownClose.ts`

## Usage for ctrlKModal.ts

I use this store to show/hide ctrlK modal
I use it in `CtrlKBadge.tsx` and in `CtrlKModal.tsx` - that's why this is global state
Becasse I use it in 2 different files

## Usage for darkModeStore.ts

I use this store to toggle dark mode
I use this in `AvatarDropdown.tsx` and in navbar as icon also in `Layout.tsx`

## Usage for index.ts

Actualy I don't use it because it not necessary becasuse even if I use 2 global states in 1 file
I find it not necessary

## Usage for supportDropdown.ts

I use this store to open/close/toggle support dropdown that you see in bottom right corner
I use it in `MarkTicketAsCompletedUser.tsx` and in hook `useSupportDropdownClose.ts`

## Usage for unseenMessages.ts

I use this global store to do actions with useen messages
In `DesktopSidebar.tsx` and in `MobileSidebar.tsx` I use this store
on pusher `updateHandler` I increase amount of unread messages
on pusher `seenHandler` I reset amount of unread messages

## Usage for useSidebar.ts

Actually I don't use it because I didn't created sidebar - its just boilerplate code for the future
to open sidebar that you see as hamburger menu icon in left top corner

## Usage for useToast.ts

I use this global store to show toast notifications about success or error
I use this file in `AddProductForm.tsx` and in `CartModal.tsx`

<br/>
<br/>
<br/>

# How to reuse/implement it one more time

areYouSureClearCartModal - `ui/Modals/dev_readme.md`

avatarDropdown - `Navbar/components/dev_readme.md`
