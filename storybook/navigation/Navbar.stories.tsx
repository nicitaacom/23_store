import { useLayoutEffect } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import type { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { customerUser, ownerUser } from "../fixtures/users"
import useCartStore from "@/store/user/cartStore"
import useUser from "@/store/user/useUser"
import { LanguageDropdown } from "@/components/LanguageDropdown"
import { NavbarView } from "@/components/Navbar/NavbarView"

interface NavigationExampleProps {
  cartQuantity: number
  locale?: TLocaleTag
  roles: string[]
  user: typeof customerUser | null
}

function NavigationExample({ cartQuantity, locale, roles, user }: NavigationExampleProps) {
  useLayoutEffect(() => {
    useUser.setState({ user })
    const products: TRecordCartProduct =
      cartQuantity > 0 ? { "storybook-product": { id: "storybook-product", quantity: cartQuantity, variantId: null } } : {}
    useCartStore.setState({ products })
    const timerId = window.setTimeout(() => useCartStore.setState({ products }), 0)
    return () => window.clearTimeout(timerId)
  }, [cartQuantity, user])

  return (
    <div className="min-h-[340px] bg-background pt-20">
      <NavbarView cartQuantity={cartQuantity} locale={locale} roles={roles} user={user} />
      <main className="p-6 text-subTitle">The application navigation remains fixed while this content scrolls.</main>
    </div>
  )
}

function LocaleMatrix() {
  const locales: TLocaleTag[] = ["en", "fi", "ru", "se"]
  return (
    <div className="grid gap-5 p-6 tablet:grid-cols-2">
      {locales.map(locale => (
        <section className="rounded-lg border border-border-color bg-foreground p-4" key={locale}>
          <h2 className="mb-3 font-semibold text-title">{locale.toUpperCase()}</h2>
          <LanguageDropdown locale={locale} />
        </section>
      ))}
    </div>
  )
}

const meta = {
  title: "Navigation/Navbar",
  component: NavigationExample,
  args: {
    cartQuantity: 0,
    roles: [],
    user: null,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NavigationExample>

export default meta
type Story = StoryObj<typeof meta>

export const Anonymous: Story = {}

export const Authenticated: Story = {
  args: { cartQuantity: 2, user: customerUser },
}

export const OwnerAndAdminLinks: Story = {
  args: { cartQuantity: 4, roles: ["OWNER", "ADMIN", "SUPPORT"], user: ownerUser },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await waitFor(() => canvasElement.querySelector('[data-cy="user-menu"]'))
    await userEvent.click((trigger as HTMLElement).parentElement as HTMLElement)
    await waitFor(() => expect(canvas.getByText("Manage products")).toBeVisible())
    await expect(canvas.getByText("Support chat")).toBeVisible()
    await expect(canvas.getByText("Stats")).toBeVisible()
  },
}

export const CartCount: Story = {
  args: { cartQuantity: 7, user: customerUser },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("7")).toBeVisible()
  },
}

export const MobileMenu: Story = {
  parameters: { viewport: { defaultViewport: "mobileLarge" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open menu" }))
    await expect(await canvas.findByRole("heading", { name: "Projects" })).toBeVisible()
    await expect(canvas.getByText("Language")).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(canvas.queryByRole("heading", { name: "Projects" })).not.toBeInTheDocument())
  },
}

export const DesktopNavigation: Story = {
  args: { cartQuantity: 1, user: customerUser },
  parameters: { viewport: { defaultViewport: "laptop" } },
}

export const AllLocales: Story = {
  render: LocaleMatrix,
}

export const DarkTheme: Story = {
  args: { cartQuantity: 3, user: customerUser },
  globals: { theme: "dark" },
}
