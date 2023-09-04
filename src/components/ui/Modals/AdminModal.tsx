import { useEffect, useRef, useState } from "react"

import supabase from "../../../utils/supabaseClient"
import type { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"

import { Button } from "../"
import { ModalContainer } from "../ModalContainer"
import { RadioButton } from "../Inputs/RadioButton"
import useUserStore from "../../../store/user/userStore"
import { InputProduct } from "../Inputs/Validation/InputProduct"
import { useForm } from "react-hook-form"

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

interface FormData {
  title: string
  subTitle: string
  price: number
  onStock: number
}

export function AdminModal({ isOpen, onClose, label }: AdminModalProps) {
  const userStore = useUserStore()

  const [images, setImages] = useState<ImageListType>([])
  const [isLoading, setIsLoading] = useState(false)
  const [productAction, setProductAction] = useState("Add product")
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)
  const dragZone = useRef<HTMLDivElement | null>(null)
  const [isDraggingg, setIsDragging] = useState(false)

  useEffect(() => {
    const handler = () => {
      setIsDragging(true)
      console.log(40, "handler in if - ")
    }
    console.log(41)
    const leaveHandler = (event: Event) => {
      if (!dragZone.current?.contains(event.target as Node)) {
        setIsDragging(false)
        event.stopPropagation()
        console.log(46, "leaveHandler in if - ")
      }
      console.log(48, "leaveHandler - ")
    }

    const dropHandler = () => {
      setIsDragging(false)
      console.log(52, "dragEndHandler - ")
    }

    const dragEndHandler = () => {
      setIsDragging(false)
      console.log(56, "dragEndHandler - ")
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

  async function createProduct(title: string, subTitle: string, price: number, onStock: number) {
    try {
      if (images.length > 0) {
        const image = images[0]
        if (image?.file && userStore.userId) {
          const { data, error } = await supabase.storage
            .from("public")
            .upload(`${userStore.userId}/${image.file.name}`, image.file, { upsert: true })
          if (error) throw error

          const response = supabase.storage.from("public").getPublicUrl(data.path)

          const updatedUserResponse = await supabase
            .from("products")
            .insert({
              title: title,
              sub_title: subTitle,
              price: price,
              on_stock: onStock,
              img_url: response.data.publicUrl,
            })
            .eq("user_id", userStore.userId)
          if (updatedUserResponse.error) throw updatedUserResponse.error
        }
      } else {
        displayResponseMessage(<p className="text-danger">Upload the image</p>)
      }
    } catch (error) {
      console.error("addProduct - ", error)
    }
  }

  const onSubmit = (data: FormData) => {
    setIsLoading(true)
    createProduct(data.title, data.subTitle, data.price, data.onStock)
    setIsLoading(false)
  }

  return (
    <ModalContainer
      className={`w-[100vw] max-w-[500px] tablet:max-w-[650px] 
    ${productAction === "Add product" && "h-[70vh] tablet:max-h-[900px]"}
     ${productAction === "Edit product" && "h-[40vh] tablet:max-h-[400px]"}
     ${productAction === "Delete product" && "h-[40vh] tablet:max-h-[400px]"}
     bg-primary rounded-md border-[1px] border-solid border-border-color py-8 overflow-y-scroll transition-all duration-500`}
      isOpen={isOpen}
      onClose={() => onClose()}>
      <div className="flex flex-col justify-center items-center w-1/2 mx-auto ">
        <h1 className="text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
        <ul className="flex flex-col tablet:flex-row w-[150%] justify-center mb-8">
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
        {productAction !== "Delete product" && (
          <ImageUploading multiple value={images} onChange={onChange} dataURLKey="data_url">
            {({ imageList, onImageUpload, onImageRemoveAll, onImageUpdate, onImageRemove, isDragging, dragProps }) => (
              <div className="flex flex-col items-center justify-center gap-y-4">
                <div className="fixed inset-0 z-[-1]" ref={dragZone} />
                <Button
                  className={`${
                    isDraggingg && "fixed inset-0 z-[101]"
                  } image-upload w-full bg-transparent px-16 py-8 text-xl whitespace-nowrap`}
                  // ref={dragZone}
                  onClick={onImageUpload}
                  {...dragProps}>
                  Click or Drop here
                </Button>
                &nbsp;
                {imageList.map((image, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-y-4 overflow-hidden rounded-xl border-[1px] border-solid border-border-color">
                    <img className="aspect-video min-w-[320px] object-cover" src={image.data_url} alt="iamge" />
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

        <form className="flex flex-col gap-y-2" onSubmit={handleSubmit(onSubmit)}>
          {productAction === "Add product" && (
            <>
              <InputProduct
                id="title"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Product title"
              />
              <InputProduct
                id="subTitle"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Product description"
              />
              <InputProduct
                id="price"
                type="number"
                register={register}
                errors={errors}
                disabled={isLoading}
                required
                placeholder="Product price"
              />
              <InputProduct
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
              <h1>Edit product content</h1>
            </>
          )}

          {productAction === "Delete product" && (
            <>
              <h1>Delete product content</h1>
            </>
          )}
        </form>
      </div>
    </ModalContainer>
  )
}
