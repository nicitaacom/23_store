// DO NOT import anything here

declare namespace API {
  type PersonalizedDesignsPlacement = {
    scale: number
    offsetXPct: number
    offsetYPct: number
  }

  type PersonalizedDesignsCreateRequest = {
    product_id: string
    variant_id?: string | null
    source_url: string
    source_width_px: number
    source_height_px: number
    print_width_mm: number
    print_height_mm: number
    placement: PersonalizedDesignsPlacement
    effective_dpi: number
  }

  type PersonalizedDesignsCreateResponse = { design_id: string } | { error: string }

  type PersonalizedDesignsMarkOrderedRequest = {
    design_ids: string[]
  }

  type PersonalizedDesignsMarkOrderedResponse = { ordered_amount: number } | { error: string }
}
