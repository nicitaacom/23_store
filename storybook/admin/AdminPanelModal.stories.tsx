import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { fixtureCategories, headphonesProduct } from "../fixtures";
import { AdminPanelModal } from "@/components/ui/Modals/AdminPanel/AdminPanelModal";

const meta = {
  title: "Admin/AdminPanelModal",
  component: AdminPanelModal,
  globals: { theme: "dark" },
  parameters: {
    // The Add tab asks for the category list on mount - answering it here keeps the story from
    // failing on an unhandled request.
    msw: { handlers: [http.get("*/api/categories/select", () => HttpResponse.json({ categories: fixtureCategories }))] },
    nextjs: {
      navigation: {
        pathname: "/en",
        query: { modal: "AdminPanel" },
      },
    },
  },
  args: {
    ownerProducts: [],
    roles: ["ADMIN"],
    isAuthenticated: true,
  },
} satisfies Meta<typeof AdminPanelModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddProduct: Story = {};
export const OwnerWithoutAdminRole: Story = {
  args: { roles: ["OWNER"] },
};

export const CreateProductReturnsToTop: Story = {
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const findByRoleResp = await canvas.findByRole("button", { name: "Create product" });
    const form = findByRoleResp.closest("form");
    if (!form) throw new Error("Create product form not found");

    const scrollTo = fn();
    Object.defineProperty(form, "scrollTo", { configurable: true, value: scrollTo });
    findByRoleResp.removeAttribute("disabled");
    await userEvent.click(findByRoleResp);

    await expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  },
};

export const UnsavedChanges: Story = {
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText("Product title"), "Unsaved product");
    await userEvent.click(canvas.getByRole("button", { name: "Close admin panel" }));
    await waitFor(() => expect(canvas.getByText("Discard unsaved changes?")).toBeVisible());
    await expect(canvas.getByRole("button", { name: "Keep editing" })).toBeVisible();
  },
};

export const CategoryDropdownEscape: Story = {
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Uncategorized" }));
    const searchInput = canvas.getByPlaceholderText("Search categories...");
    await userEvent.type(searchInput, "Appliances");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(searchInput).not.toBeVisible());
    await expect(canvas.getByText("Product workspace")).toBeVisible();
  },
};

const missingImageProduct = {
  ...headphonesProduct,
  id: "product-missing-image",
  img_url: ["/placeholder.jpg"],
  price: 300,
  created_at: "2025-01-01T00:00:00.000Z",
  translations: {
    ...headphonesProduct.translations,
    en: { ...headphonesProduct.translations.en, title: "Zeta missing image" },
  },
};
const cheapProduct = {
  ...headphonesProduct,
  id: "product-cheap",
  img_url: ["/projects/J.png"],
  price: 10,
  created_at: "2024-01-01T00:00:00.000Z",
  translations: {
    ...headphonesProduct.translations,
    en: { ...headphonesProduct.translations.en, title: "Alpha cheap product" },
  },
};

export const EditAndDeleteSorting: Story = {
  args: { ownerProducts: [headphonesProduct, cheapProduct, missingImageProduct] },
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Edit product" }));
    await userEvent.selectOptions(await canvas.findByRole("combobox", { name: "Sort products" }), "price-asc");

    await waitFor(() => {
      const products = [...canvasElement.querySelectorAll<HTMLElement>('[data-cy="owner-product"]')];
      expect(products[0]?.dataset.productId).toBe("product-missing-image");
      expect(products[1]?.dataset.productId).toBe("product-cheap");
    });

    await userEvent.click(canvas.getByRole("button", { name: "Delete product" }));
    await expect(await canvas.findByRole("button", { name: "Select" })).toBeVisible();
    await expect(await canvas.findByRole("combobox", { name: "Sort products" })).toHaveValue("price-asc");
  },
};

export const AIPriceProposals: Story = {
  args: { ownerProducts: [headphonesProduct], roles: ["OWNER"] },
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/categories/select", () => HttpResponse.json({ categories: fixtureCategories })),
        http.get("*/api/products/ai-pricing", () =>
          HttpResponse.json({
            globalEnabled: true,
            products: [
              {
                id: headphonesProduct.id,
                name: headphonesProduct.translations.en.title,
                price: headphonesProduct.price,
                enabled: true,
                baseline: headphonesProduct.price,
              },
            ],
            proposals: [
              {
                id: "proposal-1",
                run_id: "run-1",
                product_id: headphonesProduct.id,
                owner_id: headphonesProduct.owner_id,
                product_name: headphonesProduct.translations.en.title,
                current_price: headphonesProduct.price,
                baseline_price: headphonesProduct.price,
                proposed_price: 145.99,
                proposed_variants: headphonesProduct.variants,
                reasoning: "USD/JPY strengthened while China freight costs rose, supporting a small increase.",
                status: "pending",
                created_at: "2026-07-27T03:00:00.000Z",
                reviewed_at: null,
                sources: [{ title: "Market report", url: "https://example.com/market" }],
              },
            ],
          }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "AI pricing" }));
    await expect(await canvas.findByText("Price proposals")).toBeVisible();
    await expect(canvas.getByText(/USD\/JPY strengthened/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Approve" })).toBeVisible();
  },
};

// Typing a second variant's label offers the first variant's price, so a product with five sizes at
// one price is five labels instead of five labels and five prices.
export const SecondVariantTakesPreviousPrice: Story = {
  // Report mode for this story only - once the play function has typed into the form, axe measures the
  // drop zone's white-on-dark text against Storybook's light canvas and calls it low contrast.
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const variantLabelInput = await waitFor(() => canvas.getByPlaceholderText("Variant label"));
    const variantPriceInput = canvas.getByPlaceholderText("Product price");

    await userEvent.type(variantLabelInput, "Blue 3 Handle");
    await userEvent.type(variantPriceInput, "3.89");
    await userEvent.click(canvas.getByRole("button", { name: "Add variant" }));
    await waitFor(() => expect(variantLabelInput).toHaveValue(""));

    // Two characters is still mid-typing, so the price box stays empty
    await userEvent.type(variantLabelInput, "Bl");
    await expect(variantPriceInput).toHaveValue("");

    await userEvent.type(variantLabelInput, "a");
    await waitFor(() => expect(variantPriceInput).toHaveValue("3.89"));
  },
};
