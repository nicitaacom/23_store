import { useLayoutEffect } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { TProductDB } from "@/ts/product/TProductDB";
import { FIXTURE_IDS, headphonesProduct, ownerUser, productVariants, soldOutProduct } from "../fixtures";
import useUser from "@/store/user/useUser";
import Product from "@/[locale]/(site)/components/Product/Product";

// Two colour variants with a photo each plus one size variant with none - the mixed row this product
// type exists for (S/M/L look identical in a photo, so the owner attaches nothing to them).
const mixedImageVariants = [
  ...productVariants.map(variant => ({ ...variant, quantity: 5 })),
  { id: "variant-headphones-size-l", label: "50x70", image_url: null, price: 9.9, quantity: 4 },
];

function ProductWithOwner(product: TProductDB) {
  useLayoutEffect(() => {
    useUser.setState({ user: ownerUser });
  }, []);

  return <Product {...product} />;
}

const meta = {
  title: "Commerce/Product",
  component: Product,
  args: headphonesProduct,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Product>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const LongLocalizedContent: Story = {
  args: {
    translations: {
      ...headphonesProduct.translations,
      en: {
        title: "Joki professional wireless headphones with active noise cancellation and an exceptionally long product title",
        description: "**Studio detail** with a long localized explanation that verifies wrapping, truncation, compact spacing, and action alignment across mobile and desktop viewports.",
      },
    },
  },
};
export const MissingImage: Story = { args: { img_url: [] } };
export const MultipleVariants: Story = {};
export const SelectedVariant: Story = { args: { variantId: "variant-headphones-silver" } };
export const SoldOutVariant: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: /Silver/ })));
    await waitFor(() => expect(canvas.getByText("$159.99")).toBeVisible());
    await expect(canvas.getAllByText(/out of stock/i).length).toBeGreaterThan(0);
    await expect(canvas.getByRole("button", { name: /request replenishment/i })).toBeVisible();
  },
};
export const FullyOutOfStock: Story = { args: soldOutProduct };
export const VariantWithoutImage: Story = {
  args: { variants: mixedImageVariants, on_stock: 14 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // All three are selectable - the imageless one is a text chip, not a hidden variant
    for (const label of ["Midnight black", "Silver", "50x70"]) {
      const variantButton = await waitFor(() => canvas.getByRole("button", { name: new RegExp(label) }));
      await userEvent.click(variantButton);
      await waitFor(() => expect(variantButton).toHaveClass(/border-success/));
    }
    // Picking the imageless chip moves the product price with it
    await waitFor(() => expect(canvas.getAllByText("$9.90").length).toBeGreaterThan(1));
  },
};
export const ColorAndSizeOptions: Story = {
  args: {
    variants: [
      { id: "blue-s", label: "Blue S", options: { Color: "Blue", Size: "S" }, image_url: "/products/keyboard.png", price: 10, quantity: 2 },
      { id: "blue-l", label: "Blue L", options: { Color: "Blue", Size: "L" }, image_url: "/products/keyboard.png", price: 12, quantity: 2 },
      { id: "red-s", label: "Red S", options: { Color: "Red", Size: "S" }, image_url: "/products/keyboard.png", price: 10, quantity: 2 },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const large = await canvas.findByRole("button", { name: /^L$/ });
    await userEvent.click(large);
    await expect(large).toHaveAttribute("aria-pressed", "true");
    const red = canvas.getByRole("button", { name: /^Red$/ });
    await userEvent.click(red);
    await expect(red).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: /^S$/ })).toHaveAttribute("aria-pressed", "true");
  },
};
export const WeightOptionsStayWithVariant: Story = {
  args: {
    variants: [
      { id: "blue-5", group_id: "blue", label: "Blue", options: { Weight: "5 kg" }, price: 10, quantity: 2 },
      { id: "blue-10", group_id: "blue", label: "Blue", options: { Weight: "10 kg" }, price: 18, quantity: 2 },
      { id: "red-5", group_id: "red", label: "Red", options: { Weight: "5 kg" }, price: 10, quantity: 2 },
      { id: "red-10", group_id: "red", label: "Red", options: { Weight: "10 kg" }, price: 18, quantity: 2 },
      { id: "red-20", group_id: "red", label: "Red", options: { Weight: "20 kg" }, price: 30, quantity: 2 },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blueTen = await canvas.findByRole("button", { name: /^Blue / });
    await expect(canvas.queryByRole("button", { name: /^20 kg$/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /^10 kg$/ }));
    await expect(blueTen).toHaveClass(/border-success/);

    const redFive = canvas.getByRole("button", { name: /^Red / });
    await userEvent.click(redFive);
    await expect(redFive).toHaveClass(/border-success/);
    await expect(canvas.getByRole("button", { name: /^20 kg$/ })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /^10 kg$/ }));
    await expect(redFive).toHaveClass(/border-success/);
  },
};
export const CartLockedVariant: Story = {
  args: {
    cartKey: `${FIXTURE_IDS.product}::${FIXTURE_IDS.variant}`,
    variantId: FIXTURE_IDS.variant,
  },
};
export const OwnerControls: Story = { render: ProductWithOwner, globals: { theme: "dark" } };
export const AnonymousControls: Story = {};
