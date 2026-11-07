"use client"

import type { ComponentProps } from "react"

import { FormatOnStockForm } from "./FormatOnStockForm"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function EditProductOnStock(props: ComponentProps<typeof FormatOnStockForm>) {
  return <FormatOnStockForm {...props} />
}
