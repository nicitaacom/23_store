import React, { ChangeEvent, useEffect, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"
import { CiEdit } from "react-icons/ci"

import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"
import { FieldErrors, UseFormRegister, useForm } from "react-hook-form"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import supabaseClient from "@/utils/supabaseClient"
import { useRouter } from "next/navigation"

export function OwnerProductHeader({ title, price, onStock, id }: IFormDataAddProduct & { id: string }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(title: string) {
    setIsLoading(true)
    await supabaseClient.from("products").update({ title: title }).eq("id", id)
    setIsEditing(false)
    setIsLoading(false)
    router.refresh()
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const onSubmit = (data: IFormDataAddProduct) => {
    updateTitle(data.title)
  }

  const enableInput = () => {
    setIsEditing(true)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      setIsEditing(false)
    }
    if (event.key === "Enter") {
      const onSubmitForm = handleSubmit(onSubmit)
      onSubmitForm() // Call the onSubmit function directly
    }
  }

  useEffect(() => {
    const ref = inputRef.current
    // https://github.com/react-hook-form/react-hook-form/issues/11135
    // console.log(62, "inputRef.current - ", inputRef.current)
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  return (
    <section className="flex flex-col">
      <div className="flex flex-row gap-x-2 justify-between">
        <h1 className="flex flex-row">
          Title:&nbsp;
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div ref={inputRef}>
                <ProductInput
                  className={twMerge(isLoading && "animate-pulse")}
                  id="title"
                  name="title"
                  register={register}
                  errors={errors}
                  placeholder={title}
                  required
                />
              </div>
            </form>
          ) : (
            <div className="flex flex-row gap-x-2 items-center" role="button" onClick={enableInput}>
              {title}
              <CiEdit />
            </div>
          )}
        </h1>
        <h2>{price}</h2>
      </div>
      <p>On stock:{onStock}</p>
    </section>
  )
}
