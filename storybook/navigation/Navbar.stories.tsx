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

export const AvatarDropdownClosesOnOutsideClick: Story = {
  args: { cartQuantity: 4, roles: ["OWNER", "ADMIN", "SUPPORT"], user: ownerUser },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await waitFor(() => canvasElement.querySelector('[data-cy="user-menu"]'))
    await userEvent.click((trigger as HTMLElement).parentElement as HTMLElement)
    const manageProducts = await waitFor(() => canvas.getByText("Manage products"))
    await waitFor(() => expect(manageProducts).toBeVisible())

    await userEvent.click(canvas.getByText(/remains fixed while this content scrolls/))
    await waitFor(() => expect(manageProducts).not.toBeVisible())
  },
}

export const LanguageDropdownClosesOnOutsideClick: Story = {
  parameters: { viewport: { defaultViewport: "laptop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = (await waitFor(() => canvasElement.querySelector('[data-cy="language-trigger"]'))) as HTMLElement
    await userEvent.click(trigger)
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"))

    await userEvent.click(canvas.getByText(/remains fixed while this content scrolls/))
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"))
  },
}

export const ContactButtonClosesOnOutsideClick: Story = {
  parameters: { viewport: { defaultViewport: "laptop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = (await waitFor(() => canvasElement.querySelector('[data-cy="contact-trigger"]'))) as HTMLElement
    await userEvent.click(trigger)
    const telegramLink = await waitFor(() => canvas.getByText("Telegram"))
    await waitFor(() => expect(telegramLink).toBeVisible())

    await userEvent.click(canvas.getByText(/remains fixed while this content scrolls/))
    await waitFor(() => expect(telegramLink).not.toBeVisible())
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
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Projects" })).toBeVisible())
    await expect(canvas.getByText("Try it")).toBeVisible()
    await waitFor(() => expect(canvas.getByText("Language")).toBeVisible())
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

// The hint ring is an svg with no viewBox. An <svg> is a replaced element, so `inset` alone leaves it
// at its intrinsic 300x150 and the progress bar stretches across the navbar - this story measures the
// svg against the button it wraps, which is what went wrong on screen.
export const HintRingFitsTheButton: Story = {
  parameters: { viewport: { defaultViewport: "mobileLarge" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const menuButton = await waitFor(() => canvas.getByRole("button", { name: "Open menu" }))
    const progressRing = await waitFor(() => {
      const svg = canvasElement.querySelector("svg[aria-hidden='true'].pointer-events-none")
      if (!svg) throw new Error("progress ring is not on screen")
      return svg
    })

    const buttonBox = menuButton.getBoundingClientRect()
    const ringBox = progressRing.getBoundingClientRect()

    await expect(Math.round(ringBox.width)).toBe(Math.round(buttonBox.width) + 8)
    await expect(Math.round(ringBox.height)).toBe(Math.round(buttonBox.height) + 8)
  },
}
