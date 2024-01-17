"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"
import { useForm } from "react-hook-form"
import axios from "axios"

import { ProductInput } from "@/components/ui/Inputs/Validation"
import { IFormDataAddProduct } from "@/interfaces/product/IFormDataAddProduct"
import { TUpdateProductRequest } from "@/api/products/update/route"
import { useLoading } from "@/store/ui/useLoading"

interface FormatTitleFormProps {
  id: string
  title: string
}

export function FormatTitleForm({ id, title }: FormatTitleFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(title: string) {
    setIsLoading(true)
    await axios.post("/api/products/update", {
      productId: id,
      title: title,
    } as TUpdateProductRequest)
    router.refresh()
    setIsEditing(false)
    setIsLoading(false)
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
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  return (
    <h1 className="flex flex-row">
      <p className="hidden tablet:block">Title:&nbsp;</p>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(`w-full text-center tablet:text-start`, isLoading && "animate-pulse")}
              id="title"
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
  )
}
