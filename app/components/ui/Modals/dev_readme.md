# How to reuse/implement modals based on query params

## Step 1 (in this folder)

```tsx
import { ModalContainer } from "../ModalContainer"

interface NameModalProps {
  label: string
}

export function NameModal({ label }: NameModalProps) {
  return (
    <ModalContainer className="any className" modalQuery="NameModal">
      {/* ANY CONTENT (to keep consistent keep {label})*/}
      <div className="flex flex-col gap-y-2">
        <h1>{label}</h1>
        <div className="text-black">Content for auth modal</div>
      </div>
    </ModalContainer>
  )
}
```

## Step 2

Export every modal in index.ts

## Step 3 (in components folder where you have button to open modal e.g Navbar/components)

```tsx
"use client"

import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/Button"

export default function OpenNameModalButton() {
  const pathname = usePathname()
  const updatedPath = pathname + (pathname.includes("?") ? "&" : "?") + "modal=" + "NameModal"

  return (
    <Button className="w-fit" href={updatedPath}>
      Open name modal
    </Button>
  )
}
```

## Step 4

Export every button in index.ts (e.g Navbar/components/index.ts)

## Step 5

Render modal in `ModalsProvider.tsx`

```tsx
if (searchParams.getAll("modal").includes("NameModal")) {
  return <NameModal label="Name modal" />
}
```

## Step 6

Render OpenNameModalButton.tsx somewhere (e.g in Navbar.tsx)

```tsx
<OpenNameModalButton />
```

<br/>
<br/>

<br/>
<br/>

<br/>
<br/>

# How to reuse/implement modals based on global state

## Step 1 (in this folder)

```tsx
export function NameModal() {
  const nameModal = useNameModal()

  return (
    <ModalContainer className="relative w-full max-w-[450px]" isOpen={nameModal.isOpen} onClose={nameModal.closeModal}>
      <div>any content for modal based on state here</div>
    </ModalContainer>
  )
}
```

## Step 2

Export `NameMTodal.tsx` in `index.ts`

## Step 3 (in /app/store/ui)

```ts
import { create } from "zustand"

type CtrlKModalStore = {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
  toggle: () => void
}

export const useCtrlKModal = create<CtrlKModalStore>((set, get) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}))
```

You you don't need toggle - just delete it
If you need to pass some props in `openModal` just add it like so

```ts
  openModal: (id: string, title: string) => void
```

## Step 4 (in /app/providers)

Render your modal here

```tsx
<CtrlKModal />
```

<br/>
<br/>

<br/>
<br/>

<br/>
<br/>

# How to reuse/implement are you sure modals

## Step 1 (in this folder)

```tsx
export function AreYouSureDeleteProductModal() {
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()

  return (
    <AreYouSureModalContainer
      isOpen={areYouSureDeleteProductModal.isOpen}
      label={
        <h2>
          Are you sure you want delete <b>{areYouSureDeleteProductModal.title}</b>?
        </h2>
      }
      primaryButtonIcon={BiTrash}
      primaryButtonVariant="danger"
      primaryButtonAction={deleteProduct}
      primaryButtonLabel="Delete"
      secondaryButtonAction={() => areYouSureDeleteProductModal.closeModal()}
      secondaryButtonLabel="Back"
    />
  )
}
```

## Step 2

Export `AreSureModal.tsx` in `index.ts`

## Step 3 (in /app/store/ui)

```ts
import { create } from "zustand"

type AreYouSureModalStore = {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useAreYouSureModal = create<AreYouSureModalStore>(set => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}))
```

You you need need toggle - just do it like this

```ts
toggle: () => void


export const useAreYouSureModal = create<AreYouSureModalStore>((set, get) => ({
toggle: () => set({ isOpen: !get().isOpen }),
```

If you need to pass some props in `openModal` just add it like so

```ts
  openModal: (id: string, title: string) => void
```

## Step 4 (in /app/providers)

Render your modal here

```tsx
<AreYouSureDeleteProductModal />
```
