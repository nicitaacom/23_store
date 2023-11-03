"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { ProductInput } from "@/components/ui/Inputs/Validation"
import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"
import supabaseClient from "@/utils/supabaseClient"

interface FormatDescriptionFormProps {
  id: string
  subTitle: string
}

export function FormatDescriptionForm({ id, subTitle }: FormatDescriptionFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(subTitle: string) {
    setIsLoading(true)
    await supabaseClient.from("products").update({ sub_title: subTitle }).eq("id", id)
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
    updateTitle(data.subTitle)
  }

  const enableInput = () => {
    setIsEditing(true)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.shiftKey && event.key === "Enter") {
      return
    }
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
    <h1 className="flex flex-row">
      <p className="hidden tablet:block">Description:&nbsp;</p>
      {isEditing ? (
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(`border w-full text-center tablet:text-start`, isLoading && "animate-pulse")}
              id="subTitle"
              register={register}
              errors={errors}
              placeholder={subTitle + " (use 'Shift + Enter' for a new line)"}
              required
            />
          </div>
        </form>
      ) : (
        <div className="flex flex-row gap-x-2 items-center" role="button" onClick={enableInput}>
          {subTitle}
          <CiEdit />
        </div>
      )}
    </h1>
  )
}
