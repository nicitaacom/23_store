"use client"

import type { ComponentProps } from "react"

import { FormatCategoryForm } from "./FormatCategoryForm"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function EditProductCategory(props: ComponentProps<typeof FormatCategoryForm>) {
  return <FormatCategoryForm {...props} />
}
