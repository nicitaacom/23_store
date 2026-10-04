import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { HttpResponse, http } from "msw"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { fixtureCategories, headphonesProduct, soldOutProduct } from "../fixtures"
import { BannersSlider } from "@/[locale]/(site)/popular-products/BannersSlider"
import { CatalogAddProductButton } from "@/[locale]/(site)/components/CatalogAddProductButton"
import { CatalogSearchForm } from "@/[locale]/(site)/components/CatalogSearchForm"
import { CategoryPillBar } from "@/[locale]/(site)/components/CategoryPillBar"
import { ManageProductView } from "@/[locale]/(site)/products/[productId]/manage/ManageProductView"
import { NoProductsFound } from "@/[locale]/(site)/search/NoProductsFound"
import PaginationControls from "@/components/PaginationControls"
import { PopularProductCard } from "@/[locale]/(site)/popular-products/components/PopularProductCard"
import { PopularProductsLazyFeed } from "@/[locale]/(site)/popular-products/PopularProductsLazyFeed"
import { PopularProductsPreviewList } from "@/[locale]/(site)/components/PopularProductsPreviewList"
import { ProductDetailView } from "@/[locale]/(site)/products/[productId]/ProductDetailView"
import ProductsPerPage from "@/components/ProductsPerPage"
import { SortedProducts } from "@/[locale]/(site)/components/SortedProducts"

const products = [headphonesProduct, soldOutProduct]
const serverViews = { [headphonesProduct.id]: 12, [soldOutProduct.id]: 3 }
const newlyCreatedProduct = {
  ...soldOutProduct,
  id: "newly-created-product",
  translations: {
    ...soldOutProduct.translations,
    en: { ...soldOutProduct.translations.en, title: "Newly created product" },
  },
}

function ProductGridRefreshHarness() {
  const [visibleProducts, setVisibleProducts] = useState([headphonesProduct])

  return (
    <div className="p-3">
      <button type="button" onClick={() => setVisibleProducts([newlyCreatedProduct])}>
        Show newly created product
      </button>
      <SortedProducts products={visibleProducts} serverViews={{}} />
    </div>
  )
}

// The catalog surfaces talk to the category-view endpoints while they are on screen - answering them
// here keeps a story from failing on an unhandled request.
const catalogHandlers = [
  http.post("*/api/category-views/increment", () => HttpResponse.json({ success: true })),
  http.post("*/api/category-views/sync", () => HttpResponse.json({ success: true })),
  http.get("*/api/category-views/select", () => HttpResponse.json({ views: {} })),
  http.get("*/api/popular-products", () => HttpResponse.json({ products: [], totalItems: 2 })),
]

const meta = {
  title: "Commerce/Catalog",
  parameters: {
    layout: "fullscreen",
    msw: { handlers: catalogHandlers },
    nextjs: { navigation: { pathname: "/en" } },
    // Report mode - the catalog surfaces ship with the dark palette and axe flags the light-theme
    // contrast of subTitle text inside them.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SearchForm: Story = {
  render: () => (
    <div className="p-3">
      <CatalogSearchForm
        ariaLabel="Search products"
        initialQuery=""
        locale="en"
        perPage={12}
        placeholder="Search products by name or description"
        submitLabel="Search"
      />
    </div>
  ),
}

export const AddProductButton: Story = {
  render: () => (
    <div className="p-3">
      <CatalogAddProductButton isAuthenticated label="Add product" />
    </div>
  ),
}

export const CategoryPills: Story = {
  render: () => (
    <div className="p-3">
      <CategoryPillBar categories={fixtureCategories} isAuthenticated={false} locale="en" serverViews={{}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("button", { name: "AUDIO" })).toBeVisible())
  },
}

export const ProductGrid: Story = {
  render: () => (
    <div className="p-3">
      <SortedProducts products={products} serverViews={serverViews} />
    </div>
  ),
}

export const ProductGridAfterCreation: Story = {
  render: () => <ProductGridRefreshHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Show newly created product" }))
    await expect(await canvas.findByRole("link", { name: "Newly created product" })).toBeVisible()
  },
}

export const ProductGridWithoutMatches: Story = {
  render: () => (
    <div className="p-3">
      <SortedProducts products={[]} searchQuery="a query nothing matches" serverViews={{}} />
    </div>
  ),
}

export const SearchWithoutResults: Story = {
  render: () => <NoProductsFound />,
}

export const PerPagePicker: Story = {
  render: () => (
    <div className="grid min-h-64 place-items-end p-3">
      <ProductsPerPage />
    </div>
  ),
}

export const MobilePagination: Story = {
  parameters: { viewport: { defaultViewport: "mobileSmall" } },
  render: () => (
    <div className="w-[320px] max-w-full p-3">
      <PaginationControls
        basePath="/en"
        currentPage={2}
        hasNextPage
        hasPrevPage
        perPage={30}
        totalPages={6}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const nav = await within(canvasElement).findByRole("navigation", { name: "Pagination" })
    const links = [...nav.querySelectorAll("a")].filter(link => link.getClientRects().length > 0)
    await expect(links.length).toBe(2)
    await expect(links[0]).toHaveAccessibleName("Previous page")
    await expect(links[0]).toHaveAttribute("href", "/en?page=1&perPage=30")
    await expect(links[1]).toHaveAccessibleName("Next page")
    await expect(links[1]).toHaveAttribute("href", "/en?page=3&perPage=30")
    await expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth)
  },
}

export const PopularPreview: Story = {
  render: () => (
    <div className="p-3">
      <PopularProductsPreviewList hotProductIds={[headphonesProduct.id]} locale="en" products={products} showHeader />
    </div>
  ),
}

export const PopularCard: Story = {
  render: () => (
    <div className="max-w-sm p-3">
      <PopularProductCard locale="en" product={headphonesProduct} />
    </div>
  ),
}

export const PopularFeed: Story = {
  render: () => (
    <div className="p-3">
      <PopularProductsLazyFeed initialProducts={products} locale="en" totalItems={products.length} />
    </div>
  ),
}

export const Banners: Story = {
  render: () => <BannersSlider />,
}

export const ProductDetail: Story = {
  render: () => <ProductDetailView category={fixtureCategories[1]} isAuthenticated product={headphonesProduct} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [activeImage] = canvas.getAllByRole("img", { name: "Midnight black" })
    const firstThumbnail = canvas.getByRole("button", { name: "Joki wireless headphones-1" })
    const secondThumbnail = canvas.getByRole("button", { name: "Joki wireless headphones-2" })

    await userEvent.hover(secondThumbnail)
    await userEvent.unhover(secondThumbnail)
    await waitFor(() => expect(decodeURIComponent(activeImage.getAttribute("src") || "")).toContain("/projects/J.png"))

    firstThumbnail.focus()
    await waitFor(() => expect(decodeURIComponent(activeImage.getAttribute("src") || "")).toContain("/placeholder.jpg"))

    await expect(canvas.getByRole("link", { name: "AUDIO" })).toHaveAttribute(
      "href",
      "/en?category=category-audio&page=1",
    )
  },
}

export const VariantSelectionChangesMainImage: Story = {
  render: () => <ProductDetailView category={fixtureCategories[1]} isAuthenticated product={headphonesProduct} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const mainImage = () => canvasElement.querySelector("img.object-contain")
    const mainImageSource = () => decodeURIComponent(mainImage()?.getAttribute("src") || "")
    const silverVariant = await canvas.findByRole("button", { name: /Silver/ })

    await userEvent.click(silverVariant)
    await waitFor(() => expect(mainImageSource()).toContain("/projects/J.png"))

    await userEvent.hover(canvas.getByRole("button", { name: "Joki wireless headphones-2" }))
    await waitFor(() => expect(mainImageSource()).toContain("/placeholder.jpg"))

    await userEvent.click(silverVariant)
    await waitFor(() => expect(mainImageSource()).toContain("/projects/J.png"))
  },
}

export const ManageProduct: Story = {
  render: () => <ManageProductView product={headphonesProduct} />,
}
