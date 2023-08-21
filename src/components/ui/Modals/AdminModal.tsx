import { useState } from "react"

import supabase from "../../../utils/supabaseClient"
import type { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"

import { Button } from "../"
import { Input } from "../Inputs"
import { ModalContainer } from "../ModalContainer"
import { RadioButton } from "../Inputs/RadioButton"
import useUserStore from "../../../store/user/userStore"

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

export function AdminModal({ isOpen, onClose, label }: AdminModalProps) {
  const userStore = useUserStore()

  const onChange = (imageList: ImageListType) => {
    setImages(imageList)
  }

  const [valueLabel, setValueLabel] = useState<string | undefined>("")
  const [valuePrice, setValuePrice] = useState<number | undefined>()
  const [valueOnStock, setValueOnStock] = useState<number | undefined>()
  const [images, setImages] = useState<ImageListType>([])

  const [error, setError] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)

  const [productAction, setProductAction] = useState("Add product")

  async function createProduct(label: string, price: number, onStock: number) {
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
            .insert({ label: label, price: price, on_stock: onStock, img_url: response.data.publicUrl })
            .eq("user_id", userStore.userId)
          if (updatedUserResponse.error) throw updatedUserResponse.error

          setSuccess(true)
          setError(false)
        }
      }
    } catch (error) {
      setSuccess(false)
      setError(true)
      console.error("addProduct - ", error)
    }
  }

  return (
    <ModalContainer
      className={`w-[100vw] max-w-[500px] tablet:max-w-[650px] 
    ${productAction === "Add product" && "h-[90vh] tablet:max-h-[900px]"}
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

        <div className="flex flex-col gap-y-2">
          {productAction === "Add product" && (
            <>
              <Input value={valueLabel} onChange={e => setValueLabel(e.target.value)} placeholder="Label" />
              <Input
                value={valuePrice !== undefined ? valuePrice : ""}
                onChange={e => setValuePrice(e.target.valueAsNumber)}
                type="number"
                placeholder="Price"
              />
              <Input
                value={valueOnStock !== undefined ? valueOnStock : ""}
                onChange={e => setValueOnStock(e.target.valueAsNumber)}
                type="number"
                placeholder="On stock"
              />
              <ImageUploading multiple value={images} onChange={onChange} dataURLKey="data_url">
                {({
                  imageList,
                  onImageUpload,
                  onImageRemoveAll,
                  onImageUpdate,
                  onImageRemove,
                  isDragging,
                  dragProps,
                }) => (
                  // write your building UI
                  <div className="flex flex-col items-center justify-center gap-y-4">
                    <Button
                      className={`image-upload w-full bg-transparent px-16 py-8 text-xl whitespace-nowrap ${
                        isDragging && "brightness-75"
                      }`}
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
              <div className="flex flex-col gap-y-2 w-full">
                <Button onClick={() => createProduct(valueLabel ?? "", valuePrice ?? 0, valueOnStock ?? 0)}>
                  Create product
                </Button>
                {error && <p className="text-danger text-center">Error</p>}
                {success && <p className="text-success text-center">Success</p>}
              </div>
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
        </div>
      </div>
    </ModalContainer>
  )
}
