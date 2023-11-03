import React, { ChangeEvent, useEffect, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"
import { CiEdit } from "react-icons/ci"

import { OwnerProductInput } from "@/components/ui/Inputs/Validation/OnwerProductInput"
import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"
import { FieldErrors, UseFormRegister, useForm } from "react-hook-form"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import supabaseClient from "@/utils/supabaseClient"
import { useRouter } from "next/navigation"

export function OwnerProductHeader({ title, price, onStock, id }: IFormDataAddProduct & { id: string }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const onSubmit = async (data: IFormDataAddProduct) => {
    console.log(18, "getValues('title') - ", getValues("title"))
    await supabaseClient.from("products").update({ title: data.title }).eq("id", id)
  }

  const enableInput = () => {
    // setValue("title", title)
    setIsEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(0, inputRef.current.value.length)
    }, 0)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      console.log("esc value - ", title)
      // setValue("title", title)
      setIsEditing(false)
    }
    if (event.key === "Enter") {
      const onSubmitForm = handleSubmit(onSubmit)
      console.log("handleSubmit")
      onSubmitForm() // Call the onSubmit function directly
      // console.log("enter value - ", getValues("title"))
      setIsEditing(false)
    }
  }

  const onChange = (e: string) => {
    console.log(e)
  }

  useEffect(() => {
    const ref = inputRef.current
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  console.log(51, "isEditing - ", isEditing)
  // console.log(51, "getValues - ", getValues("title"))

  return (
    <section className="flex flex-col">
      <div className="flex flex-row gap-x-2 justify-between">
        <h1 className="flex flex-row items-center">
          Title:&nbsp;
          {isEditing ? (
            <OwnerProductInput id="title" register={register} errors={errors} ref={inputRef} placeholder={title} />
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
