"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"

import { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { Button } from "@/components/ui/Button"
import useDragging from "@/hooks/ui/useDragging"
import { twMerge } from "tailwind-merge"
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { showToastWarningFn } from "../functions/showToastWarningFn"
import { createProductFn } from "@/functions/createProductFn"
import { useScopedI18n } from "@/locales/client"

export function AddProductForm() {
  const t = useScopedI18n("product")
  const toast = useToast()
  const { isDraggingg } = useDragging()
  const { isLoading } = useLoading()

  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)
  const [images, setImages] = useState<ImageListType>([])

  const dragZone = useRef<HTMLButtonElement | null>(null)

  // TODO - check if it's required and if would be better with or without displaying response message
  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
    setTimeout(() => {
      setResponseMessage(<p></p>)
    }, 5000)
  }

  const onChange = (imageList: ImageListType) => {
    console.log(102, imageList)
    setImages(imageList)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const onSubmit = async (data: IFormDataAddProduct) => {
    if (data.subTitle.length > 600) return toast.show("warning", "Enter shorter description", "Enter description 0-600 symbols")
    await createProductFn(t, data.title, data.subTitle, data.price, data.onStock, images)
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-y-5 transition-all duration-300">
      <ImageUploading
        multiple
        value={images}
        onChange={onChange}
        resolutionWidth={1000} // minimum 1000 width
        resolutionHeight={500} // minimum 500 height
        resolutionType="more"
        dataURLKey="data_url"
        onError={errors => showToastWarningFn(t, errors)}>
        {({
          imageList,
          onImageUpload,
          onImageRemoveAll,
          onImageUpdate,
          onImageRemove,
          isDragging,
          // TODO - maxFileSize compress to AVIF in the future,
          dragProps,
        }) => (
          <div className="flex w-full flex-col items-center justify-center gap-y-3">
            <Button
              className={`${
                isDraggingg && "fixed inset-0 z-[101] !bg-[rgba(0,0,0,0.6)]"
              } image-upload min-h-[164px] w-full rounded-2xl border border-dashed border-border-color bg-background/30 px-6 py-8 text-base whitespace-nowrap`}
              ref={dragZone}
              onClick={onImageUpload}
              disabled={isLoading}
              {...dragProps}>
              <div className="pointer-events-none select-none text-center">
                <h1 className="text-lg font-semibold">{isDragging ? t("drop_files_here") : t("click_or_drop_here")}</h1>
                <p className="mt-2 text-sm text-subTitle">Wide product images work best here.</p>
              </div>
            </Button>
            {imageList.map((image, index) => (
              <div
                key={index}
                className="flex w-full flex-col gap-y-3 overflow-hidden rounded-2xl border border-border-color/70 bg-background/30 p-3">
                <Image
                  className="aspect-video w-full rounded-xl object-cover"
                  src={image.data_url}
                  alt="iamge"
                  width={0}
                  height={0}
                />
                <div className="flex flex-row items-center justify-end gap-x-3">
                  <Button size="sm" variant="secondary-outline" onClick={() => onImageUpdate(index)} disabled={isLoading}>
                    {t("update")}
                  </Button>
                  <Button size="sm" variant="danger-outline" onClick={() => onImageRemove(index)} disabled={isLoading}>
                    {t("remove")}
                  </Button>
                </div>
              </div>
            ))}
            <Button className="w-full" size="sm" variant="danger-outline" onClick={void onImageRemoveAll} disabled={isLoading}>
              {t("remove_all_images")}
            </Button>
          </div>
        )}
      </ImageUploading>
      <form className="flex flex-col gap-y-3 rounded-2xl border border-border-color/70 bg-background/25 p-4 tablet:p-5" onSubmit={handleSubmit(onSubmit)}>
        <ProductInput
          className="w-full rounded-xl border border-border-color/70 bg-background/60 px-3 py-2.5"
          id="title"
          register={register}
          errors={errors}
          disabled={isLoading}
          required
          placeholder={t("placeholder.title")}
        />
        <ProductInput
          className="min-h-[112px] w-full rounded-xl border border-border-color/70 bg-background/60 px-3 py-2.5"
          id="subTitle"
          register={register}
          errors={errors}
          disabled={isLoading}
          required
          placeholder={t("placeholder.description")}
        />
        <ProductInput
          className="w-full rounded-xl border border-border-color/70 bg-background/60 px-3 py-2.5"
          id="price"
          type="numeric"
          register={register}
          errors={errors}
          disabled={isLoading}
          required
          placeholder={t("placeholder.price")}
        />
        <ProductInput
          className="w-full rounded-xl border border-border-color/70 bg-background/60 px-3 py-2.5"
          id="onStock"
          type="number"
          register={register}
          errors={errors}
          disabled={isLoading}
          required
          placeholder={t("placeholder.on_stock")}
        />
        <div className="text-center">{responseMessage}</div>
        <Button
          className={twMerge(`mt-1 w-full`, isLoading && "opacity-50 cursor-default pointer-events-none")}
          disabled={isLoading}>
          {t("create_product")}
        </Button>
      </form>
    </div>
  )
}
