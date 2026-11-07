"use client"

import type { ComponentProps } from "react"

import { FormatDescriptionForm } from "./FormatDescriptionForm"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function EditProductDescription(props: ComponentProps<typeof FormatDescriptionForm>) {
  return <FormatDescriptionForm {...props} />
}
