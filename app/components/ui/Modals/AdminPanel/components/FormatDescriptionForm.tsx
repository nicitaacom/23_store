"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import axios from "axios"

import { IFormDataAddProduct } from "@/interfaces/product/IFormDataAddProduct"
import { TUpdateProductRequest } from "@/api/products/update/route"
import { useLoading } from "@/store/ui/useLoading"
import { ProductInput } from "@/components/ui/Inputs/Validation"

interface FormatDescriptionFormProps {
  id: string
  subTitle: string
}

export function FormatDescriptionForm({ id, subTitle }: FormatDescriptionFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(subTitle: string) {
    setIsLoading(true)
    await axios.post("/api/products/update", { productId: id, subTitle: subTitle } as TUpdateProductRequest)
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
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  return (
    <h1 className="flex flex-row justify-center tablet:justify-start mt-4 tablet:mt-0">
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
          <h2 className="text-center">{subTitle}</h2>
          <CiEdit />
        </div>
      )}
    </h1>
  )
}
