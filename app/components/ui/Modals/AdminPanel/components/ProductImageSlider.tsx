"use client"

import type { ComponentProps } from "react"

import { OwnerProductImageSlider } from "./OwnerProductImageSlider"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function ProductImageSlider(props: ComponentProps<typeof OwnerProductImageSlider>) {
  return <OwnerProductImageSlider {...props} />
}
