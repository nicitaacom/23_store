"use client"

import type { ComponentProps } from "react"

import { FormatTitleForm } from "./FormatTitleForm"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function EditProductTitle(props: ComponentProps<typeof FormatTitleForm>) {
  return <FormatTitleForm {...props} />
}
