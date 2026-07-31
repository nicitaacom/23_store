export const ADMIN_PRODUCT_SORTS = {
  createdDesc: "created-desc",
  createdAsc: "created-asc",
  priceAsc: "price-asc",
  priceDesc: "price-desc",
  nameAsc: "name-asc",
  nameDesc: "name-desc",
} as const

export type TAdminProductSort = (typeof ADMIN_PRODUCT_SORTS)[keyof typeof ADMIN_PRODUCT_SORTS]
