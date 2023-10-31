"use client"

import Image from "next/image"

import { CiEdit } from "react-icons/ci"

import { IDBProduct } from "@/interfaces/IDBProduct"
import { Slider } from "../../.."
import { formatCurrency } from "@/utils/currencyFormatter"
import { EditInput } from "@/components/ui/Inputs/Validation/EditTitleInput"
import { FieldValues, useForm } from "react-hook-form"
import { useEffect, useState } from "react"

interface EditProductForm {
  ownerProducts: IDBProduct[]
}

export default function EditProductForm({ ownerProducts }: EditProductForm) {
  const [isLoading, setIsLoading] = useState(false)
  const [showTitleInput, setShowTitleInput] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const initialTitleInputs = ownerProducts.reduce((acc, ownerProduct) => {
      return {
        ...acc,
        [ownerProduct.id]: false,
      }
    }, {})

    setShowTitleInput(initialTitleInputs)
  }, [ownerProducts])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>()

  const toggleShowTitleInput = (productId: string) => {
    setShowTitleInput(prevState => ({
      ...prevState,
      [productId]: !prevState[productId],
    }))
  }
  console.log("EditProductForm.tsx re-render")

  return (
    <>
      {ownerProducts.length > 0 ? (
        <div className="w-[90%] mx-auto h-[calc(90vh-32px)]">
          {ownerProducts.map(ownerProduct => (
            <article
              key={ownerProduct.id}
              className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-border-color">
              {ownerProduct.img_url.length === 1 ? (
                <figure className="relative tablet:aspect-video tablet:h-[100px] tablet:w-fit object-coverw">
                  <Image
                    className="tablet:aspect-video w-full tablet:h-[100px] tablet:w-fit object-cover"
                    src={ownerProduct.img_url[0]}
                    alt="image"
                    width={177}
                    height={100}
                    priority
                  />
                </figure>
              ) : (
                <Slider
                  containerClassName="tablet:w-fit"
                  className="h-[300px]"
                  images={ownerProduct.img_url}
                  title={ownerProduct.title}
                />
              )}
              <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-2 py-2">
                <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start text-brand">
                  <div className="flex flex-col mobile:flex-row gap-x-2 justify-between items-center w-full">
                    <div
                      className={`w-full mobile:w-[60%] flex flex-row gap-x-2 items-center
                       text-2xl text-center mobile:text-start tablet:text-xl desktop:text-2xl overflow-hidden ${
                         ownerProduct.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"
                       }`}
                      onClick={() => toggleShowTitleInput(ownerProduct.id)}>
                      <h1>Title:</h1>
                      {showTitleInput[ownerProduct.id] ? (
                        <EditInput id="title" register={register} errors={errors} placeholder={ownerProduct.title} />
                      ) : (
                        <div className="flex flex-row gap-x-2 items-center">
                          {ownerProduct.title} <CiEdit className="text-icon-color" />
                        </div>
                      )}
                    </div>
                    <h1 className="w-full mobile:w-[35%] text-2xl text-center mobile:text-end tablet:text-lg desktop:text-xl">
                      {formatCurrency(ownerProduct.price)}
                    </h1>
                  </div>
                </section>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to edit</h1>
      )}
    </>
  )
}
