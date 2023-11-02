import { memo, useEffect, useRef } from "react"
import { FieldErrors, UseFormRegister } from "react-hook-form"

import { Slider } from "@/components/ui"
import { IDBProduct } from "@/interfaces/IDBProduct"
import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"

import { OwnerProductImage } from "./OwnerProductImage"

type Props = IDBProduct & {
  toggleShowTitleInput: (id: string) => void
  showTitleInput: boolean
  register: UseFormRegister<IFormDataAddProduct>
  errors: FieldErrors
}

function OwnerProduct({ ...ownerProduct }: Props) {
  const ref = useRef<HTMLElement>(null)

  const handlerOneMore = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      console.log(24, "esc key pressed in OwnerProduct.tsx")
      ownerProduct.toggleShowTitleInput(ownerProduct.id)
    }
  }

  useEffect(() => {
    const currentRef = ref.current
    if (ref.current) {
      ref.current.addEventListener("keydown", handlerOneMore)
    }
    return () => currentRef?.removeEventListener("keydown", handlerOneMore)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current])

  const handleEditProduct = (id: string) => {
    ownerProduct.toggleShowTitleInput(id)
  }

  return (
    <article
      className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-border-color"
      ref={ref}
      key={ownerProduct.id}>
      {ownerProduct.img_url.length === 1 ? (
        <OwnerProductImage imgUrl={ownerProduct.img_url[0]} />
      ) : (
        <Slider images={ownerProduct.img_url} title={ownerProduct.title} />
      )}
      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-2 py-2">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start text-brand"></section>
      </div>
    </article>
  )
}

export default memo(OwnerProduct)
