"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

import { useForm } from "react-hook-form"
import { Stripe, loadStripe } from "@stripe/stripe-js"
import supabaseClient from "@/utils/supabaseClient"
import { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"
import axios from "axios"

import { ProductInput } from "@/components/ui/Inputs/Validation/ProductInput"
import { ModalContainer } from "../ModalContainer"
import useUserStore from "@/store/user/userStore"
import { Button, RadioButton } from ".."

interface AddProductModalProps {
  label: string
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  title: string
  subTitle: string
  price: number
  onStock: number
}

export function AddProductModal({ label }: AddProductModalProps) {
  const userStore = useUserStore()

  const [stripe, setStripe] = useState<Stripe | null>(null)
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC)
      setStripe(stripeInstance)
    }

    initializeStripe()
  }, [])

  const [images, setImages] = useState<ImageListType>([])
  const [isLoading, setIsLoading] = useState(false)
  const [productAction, setProductAction] = useState("Add product")
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)
  const dragZone = useRef<HTMLButtonElement | null>(null)
  const [isDraggingg, setIsDragging] = useState(false)

  useEffect(() => {
    const handler = () => {
      setIsDragging(true)
    }

    const leaveHandler = () => {
      setIsDragging(false)
    }

    const dropHandler = () => {
      setIsDragging(false)
    }

    const dragEndHandler = () => {
      setIsDragging(false)
    }

    document.addEventListener("dragover", handler, true)
    document.addEventListener("dragleave", leaveHandler, true)
    document.addEventListener("drop", dropHandler, true)
    document.addEventListener("dragend", dragEndHandler, true)

    return () => {
      document.removeEventListener("dra", handler)
      document.removeEventListener("dragleave", leaveHandler)
      document.removeEventListener("drop", dropHandler)
      document.removeEventListener("dragend", dragEndHandler)
    }
  }, [])

  const onChange = (imageList: ImageListType) => {
    setImages(imageList)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>()

  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
    setTimeout(() => {
      setResponseMessage(<p></p>)
    }, 5000)
  }

  async function createProduct(images: ImageListType, title: string, subTitle: string, price: number, onStock: number) {
    try {
      //Check images length and is stripe mounted
      if (images.length > 0 && stripe) {
        const imagesArray = await Promise.all(
          images.map(async image => {
            if (image?.file && userStore.userId) {
              const { data, error } = await supabaseClient.storage
                .from("public")
                .upload(`${userStore.userId}/${image.file.name}`, image.file, { upsert: true })
              if (error) throw error

              const response = supabaseClient.storage.from("public").getPublicUrl(data.path)
              return response.data.publicUrl
            }
          }),
        )
        //create product
        const priceResponse = await axios.post("/api/products", {
          images: imagesArray,
          title: title,
          subTitle: subTitle,
          price: price,
        })
        console.log(122, "priceResponse.data - ", priceResponse.data)

        const updatedUserResponse = await supabaseClient
          .from("products")
          .insert({
            id: priceResponse.data.id,
            title: title,
            sub_title: subTitle,
            price: price,
            on_stock: onStock,
            img_url: imagesArray as string[],
          })
          .eq("user_id", userStore.userId)
        if (updatedUserResponse.error) throw updatedUserResponse.error
        displayResponseMessage(<p className="text-success">Product added</p>)
      } else {
        console.log(stripe, images.length)
        displayResponseMessage(<p className="text-danger">Upload the image</p>)
      }
    } catch (error) {
      console.log(94, "error - ", error)
    }
  }

  const onSubmit = (data: FormData) => {
    setIsLoading(true)
    createProduct(images, data.title, data.subTitle, data.price, data.onStock)
    setIsLoading(false)
  }

  return (
    <ModalContainer
      className={`w-[100vw] max-w-[500px] tablet:max-w-[650px] 
     bg-primary rounded-md border-[1px] border-solid border-border-color pt-8 `}
      modalQuery="AddProduct">
      <div
        className={`relative flex flex-col items-center w-full pb-8
        ${isDraggingg ? "overflow-hidden" : "overflow-y-scroll"}
        ${productAction === "Add product" && "h-[70vh] tablet:max-h-[900px]"}
        ${productAction === "Edit product" && "h-[50vh] tablet:max-h-[500px]"}
        ${productAction === "Delete product" && "h-[40vh] tablet:max-h-[400px]"}
        transition-all duration-500`}>
        <h1 className="text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
        <ul className="flex flex-col tablet:flex-row justify-center mb-8">
          <li>
            <RadioButton
              label="Add product"
              inputName="product"
              onChange={e => setProductAction(e.target.value)}
              defaultChecked
            />
          </li>
          <li>
            <RadioButton label="Edit product" inputName="product" onChange={e => setProductAction(e.target.value)} />
          </li>
          <li>
            <RadioButton label="Delete product" inputName="product" onChange={e => setProductAction(e.target.value)} />
          </li>
        </ul>
        {productAction === "Add product" && (
          <ImageUploading multiple value={images} onChange={onChange} dataURLKey="data_url">
            {({ imageList, onImageUpload, onImageRemoveAll, onImageUpdate, onImageRemove, isDragging, dragProps }) => (
              <div className="flex flex-col items-center justify-center gap-y-4 w-[50%]">
                <Button
                  className={`${
                    isDraggingg && "fixed inset-0 z-[101] !bg-[rgba(0,0,0,0.6)]"
                  } image-upload w-full bg-transparent px-16 py-8 text-xl whitespace-nowrap transition-all duration-300`}
                  ref={dragZone}
                  onClick={onImageUpload}
                  {...dragProps}>
                  <h1 className="pointer-events-none select-none">
                    {isDragging ? "Drop files here" : "Click or Drop here"}
                  </h1>
                </Button>
                &nbsp;
                {imageList.map((image, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-y-4 overflow-hidden rounded-xl border-[1px] border-solid border-border-color">
                    <Image
                      className="aspect-video min-w-[320px] object-cover"
                      src={image.data_url}
                      alt="iamge"
                      width={0}
                      height={0}
                    />
                    <div className="mb-4 flex flex-row items-center justify-center gap-x-4 px-4">
                      <Button className="w-1/2" onClick={() => onImageUpdate(index)}>
                        Update
                      </Button>
                      <Button className="w-1/2" variant="danger-outline" onClick={() => onImageRemove(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="mb-4 flex w-full flex-row items-center justify-center gap-x-4">
                  <Button className="w-full" variant="danger-outline" onClick={void onImageRemoveAll}>
                    Remove all images
                  </Button>
                </div>
              </div>
            )}
          </ImageUploading>
        )}

        <form className="flex flex-col gap-y-2 w-[50%]" onSubmit={handleSubmit(onSubmit)}>
          {productAction === "Add product" && (
            <>
              <ProductInput
                id="title"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Product title"
              />
              <ProductInput
                id="subTitle"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Product description"
              />
              <ProductInput
                id="price"
                type="numeric"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Product price"
              />
              <ProductInput
                id="onStock"
                type="number"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Amount on stock"
              />
              {responseMessage}
              <Button>Create product</Button>
            </>
          )}

          {productAction === "Edit product" && (
            <>
              <h1 className="text-center">Edit product content</h1>
            </>
          )}

          {productAction === "Delete product" && (
            <>
              <h1 className="text-center">Delete product content</h1>
            </>
          )}
        </form>
      </div>
    </ModalContainer>
  )
}
