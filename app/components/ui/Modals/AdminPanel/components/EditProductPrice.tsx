"use client"

import type { ComponentProps } from "react"

import { FormatPriceForm } from "./FormatPriceForm"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function EditProductPrice(props: ComponentProps<typeof FormatPriceForm>) {
  return <FormatPriceForm {...props} />
}
