import { FieldErrors, UseFormRegister } from "react-hook-form"
import { ProductInput } from "../../../Inputs/Validation"
import { Button } from "../../.."

interface AddProductForm {
  register: UseFormRegister<any>
  errors: FieldErrors
  responseMessage: React.ReactNode
  isLoading: boolean
}

export default function AddProductForm({ register, errors, responseMessage, isLoading }: AddProductForm) {
  return (
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
      <div className="text-center">{responseMessage}</div>
      <Button className={`${isLoading && "opacity-50 cursor-default pointer-events-none"}`} disabled={isLoading}>
        Create product
      </Button>
    </>
  )
}
