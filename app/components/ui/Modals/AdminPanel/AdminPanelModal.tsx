"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { useForm } from "react-hook-form"
import { Stripe, loadStripe } from "@stripe/stripe-js"
import { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"
import axios from "axios"
import { AiOutlinePlus, AiOutlineDelete } from "react-icons/ai"
import { CiEdit } from "react-icons/ci"

import supabaseClient from "@/utils/supabaseClient"
import { Button, RadioButton } from "@/components/ui"
import useUserStore from "@/store/user/userStore"
import { IDBProduct } from "@/interfaces/IDBProduct"
import { useRouter } from "next/navigation"
import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"
import useDragging from "@/hooks/ui/useDragging"

import { ModalContainer } from "../../ModalContainer"
import AddProductForm from "./components/AddProductForm"
import EditProductForm from "./components/EditProductForm"

interface AdminPanelModalProps {
  label: string
  ownerProducts: IDBProduct[]
}

export function AdminPanelModal({ label, ownerProducts }: AdminPanelModalProps) {
  const router = useRouter()
  const userStore = useUserStore()

  const [images, setImages] = useState<ImageListType>([])
  const [isLoading, setIsLoading] = useState(false)
  const [productAction, setProductAction] = useState("Add product")
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)
  const dragZone = useRef<HTMLButtonElement | null>(null)

  const { isAuthenticated } = useUserStore()
  if (!isAuthenticated) {
    router.push("/?modal=AuthModal&variant=login")
  }

  const [stripe, setStripe] = useState<Stripe | null>(null)

  const onChange = (imageList: ImageListType) => {
    setImages(imageList)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
    setTimeout(() => {
      setResponseMessage(<p></p>)
    }, 5000)
  }

  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC)
      setStripe(stripeInstance)
    }
    initializeStripe()
  }, [])

  const { isDraggingg } = useDragging()

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
            owner_id: userStore.userId,
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

  const onSubmit = (data: IFormDataAddProduct) => {
    createProduct(images, data.title, data.subTitle, data.price, data.onStock)
  }

  return (
    <ModalContainer
      className={twMerge(
        `w-[100vw] max-w-[768px] max-h-full
      flex flex-col bg-primary rounded-md border-[1px] border-solid border-border-color pt-8`,
        productAction === "Add product" && "tablet:max-w-[650px]",
        productAction === "Edit product" && "tablet:max-w-full laptop:max-w-[1024px] desktop:max-w-[1440px]",
      )}
      modalQuery="AdminPanel">
      <h1 className="min-h-[40px] text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
      <ul className="min-h-[144px] tablet:min-h-[50px] flex flex-col tablet:flex-row justify-center mb-8">
        <li>
          <RadioButton
            label="Add product"
            inputName="product"
            onChange={e => setProductAction(e.target.value)}
            defaultChecked>
            <div className="flex flex-row gap-x-2 items-center">
              Add product <AiOutlinePlus className="text-success" />
            </div>
          </RadioButton>
        </li>
        <li>
          <RadioButton label="Edit product" inputName="product" onChange={e => setProductAction(e.target.value)}>
            <div className="flex flex-row gap-x-2 items-center">
              Edit product <CiEdit className="text-warning" />
            </div>
          </RadioButton>
        </li>
        <li>
          <RadioButton label="Delete product" inputName="product" onChange={e => setProductAction(e.target.value)}>
            <div className="flex flex-row gap-x-2 items-center">
              Delete product <AiOutlineDelete className="text-danger" />
            </div>
          </RadioButton>
        </li>
      </ul>
      <div
        className={twMerge(
          `relative w-full pb-8 flex flex-col items-center transition-all duration-500`,
          isDraggingg ? "overflow-hidden" : "overflow-y-scroll",
          productAction === "Add product" && "tablet:max-h-[900px]",
          productAction === "Edit product" && "tablet:max-h-[600px]",
          productAction === "Delete product" && "h-[40vh] tablet:max-h-[400px]",
        )}>
        {/* ADD PRODUCT */}

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

        <form
          className={`flex flex-col gap-y-2 ${productAction === "Add product" ? "w-[50%]" : "w-[100%]"}`}
          onSubmit={handleSubmit(onSubmit)}>
          {productAction === "Add product" && (
            <AddProductForm
              register={register}
              errors={errors}
              responseMessage={responseMessage}
              isLoading={isLoading}
            />
          )}

          {/* EDIT PRODUCT */}

          {productAction === "Edit product" && <EditProductForm ownerProducts={ownerProducts} />}

          {/* DELETE PRODUCT */}

          {productAction === "Delete product" && (
            <>
              {ownerProducts.length > 0 ? (
                <div>content</div>
              ) : (
                <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to delete</h1>
              )}
            </>
          )}
        </form>
      </div>
    </ModalContainer>
  )
}
