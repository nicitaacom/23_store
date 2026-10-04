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
    msw: { handlers: [
      http.get("*/api/categories/select", () => HttpResponse.json({ categories: fixtureCategories })),
      http.get("*/api/products/ai-pricing", () => HttpResponse.json({ globalEnabled: false, products: [], proposals: [] })),
      http.post("*/api/ai/suggest-category", () => HttpResponse.json({ category_id: null })),
    ] },
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
export const TabFromDescriptionToVariant: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await waitFor(() => {
      const visiblePanel = canvasElement.querySelector<HTMLElement>(".halloween-panel");
      if (!visiblePanel) throw new Error("Admin panel is not ready");
      return visiblePanel;
    });
    await waitFor(() => {
      expect(Number(getComputedStyle(panel).opacity)).toBe(1);
      if (!panel.parentElement) throw new Error("Admin panel backdrop is not ready");
      expect(Number(getComputedStyle(panel.parentElement).opacity)).toBe(1);
    });
    const editor = await waitFor(() => {
      const content = canvasElement.querySelector<HTMLElement>(".ProseMirror");
      if (!content) throw new Error("Description editor is not ready");
      return content;
    });

    await userEvent.click(editor);
    await expect(editor).toHaveFocus();
    await userEvent.tab();

    await waitFor(() => expect(canvas.getByPlaceholderText("Variant label")).toHaveFocus());
  },
};
export const FileDragOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const upload = await canvas.findByTestId("add-product-upload");

    const text = new DataTransfer();
    text.setData("text/plain", "selected description");
    document.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: text }));
    await expect(upload).not.toHaveClass(/fixed/);

    const files = new DataTransfer();
    files.items.add(new File(["image"], "chair-drag-test-1.png", { type: "image/png" }));
    document.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: files }));
    await waitFor(() => expect(upload).toHaveClass(/fixed/));
    document.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: files }));
    await waitFor(() => expect(upload).not.toHaveClass(/fixed/));
    const modal = upload.closest('[class*="bg-modal-surface"]');
    await waitFor(() => expect(Number(getComputedStyle(modal!).opacity)).toBeGreaterThan(0.99));
  },
};
export const MultipleValuesForOneOption: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const variantLabel = await canvas.findByPlaceholderText("Variant label");
    const optionName = await canvas.findByPlaceholderText("Option (Color, Size, Weight...)");
    const optionValue = canvas.getByPlaceholderText("Value (Blue, XL, 2.5 kg...)");

    await userEvent.type(variantLabel, "Blue");
    await expect(canvas.getByText("Options for Blue")).toBeVisible();
    await userEvent.type(optionName, "Size");
    await userEvent.type(optionValue, "36");
    await userEvent.click(canvas.getByRole("button", { name: "Add option" }));
    await expect(optionName).toHaveValue("Size");
    await expect(optionValue).toHaveValue("");
    await expect(optionValue).toHaveFocus();
    await userEvent.type(optionValue, "38");
    await userEvent.click(canvas.getByRole("button", { name: "Add option" }));
    await expect(canvas.getByRole("button", { name: "Size: 36 ×" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Size: 38 ×" })).toBeVisible();

    await userEvent.type(canvas.getByPlaceholderText("Product price"), "12");
    await userEvent.type(canvas.getByPlaceholderText("0"), "4");
    await userEvent.click(canvas.getByRole("button", { name: "Add variant" }));
    await expect(within(canvas.getByText("Blue").parentElement!).getByText("Size: 36, 38")).toBeVisible();
    await expect(canvas.queryByText("Blue / Size: 38")).not.toBeInTheDocument();
    await expect(canvas.getByPlaceholderText("Option (Color, Size, Weight...)")).toHaveValue("");
    await expect(canvas.queryByRole("button", { name: "Size: 36 ×" })).not.toBeInTheDocument();

    await userEvent.type(variantLabel, "Red");
    await expect(canvas.getByText("Options for Red")).toBeVisible();
    await userEvent.type(canvas.getByPlaceholderText("Option (Color, Size, Weight...)"), "Weight");
    await userEvent.type(canvas.getByPlaceholderText("Value (Blue, XL, 2.5 kg...)"), "10 kg");
    await userEvent.click(canvas.getByRole("button", { name: "Add option" }));
    await userEvent.type(canvas.getByPlaceholderText("Product price"), "14");
    await userEvent.click(canvas.getByRole("button", { name: "Add variant" }));
    await expect(within(canvas.getByText("Red").parentElement!).getByText("Weight: 10 kg")).toBeVisible();
    await expect(within(canvas.getByText("Blue").parentElement!).queryByText("Weight: 10 kg")).not.toBeInTheDocument();
  },
};

export const EditGroupedSizes: Story = {
  parameters: { a11y: { test: "todo" } },
  args: {
    ownerProducts: [{
      ...headphonesProduct,
      variants: [
        { id: "grey-38", group_id: "grey", label: "Grey", options: { Size: "38.5" }, image_url: null, price: 17.44, quantity: 114 },
        { id: "grey-39", group_id: "grey", label: "Grey / Size: 39.5", options: { Size: "39.5" }, image_url: null, price: 17.44, quantity: 114 },
      ],
    }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Edit product" }));
    await expect(await canvas.findByText("Options for Grey")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Size: 38.5 ×" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Size: 39.5 ×" })).toBeVisible();
    await expect(canvas.queryByText("Options for Grey / Size: 39.5")).not.toBeInTheDocument();

    const name = canvas.getByPlaceholderText("Option (Color, Size, Weight...)");
    const value = canvas.getByPlaceholderText("Value (Blue, XL, 2.5 kg...)");
    await userEvent.type(name, "Size");
    await userEvent.type(value, "40");
    await userEvent.click(canvas.getByRole("button", { name: "Add option" }));
    await expect(canvas.getByRole("button", { name: "Size: 40 ×" })).toBeVisible();
    await expect(canvas.queryByText("Options for Grey / Size: 40")).not.toBeInTheDocument();
  },
};
export const BackdropClosesPanel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("Product workspace")).toBeVisible());
    await userEvent.click(canvasElement);
    await waitFor(() => expect(canvas.queryByText("Product workspace")).not.toBeInTheDocument());
  },
};
export const OwnerWithoutAdminRole: Story = {
  args: { roles: ["OWNER"] },
  play: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
  },
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
    await userEvent.click(canvas.getByRole("button", { name: "Close confirmation" }));
    await waitFor(() => expect(canvas.queryByText("Discard unsaved changes?")).not.toBeInTheDocument());
    await expect(canvas.getByPlaceholderText("Product title")).toHaveValue("Unsaved product");

    await userEvent.click(canvas.getByRole("button", { name: "Close admin panel" }));
    await waitFor(() => expect(canvas.getByText("Discard unsaved changes?")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByText("Discard unsaved changes?")).not.toBeInTheDocument());
    await expect(canvas.getByPlaceholderText("Product title")).toHaveValue("Unsaved product");

    await userEvent.click(canvasElement);
    await waitFor(() => expect(canvas.getByText("Discard unsaved changes?")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(canvas.queryByText("Discard unsaved changes?")).not.toBeInTheDocument());
    await expect(canvas.getByPlaceholderText("Product title")).toHaveValue("Unsaved product");
  },
};

export const CategoryDropdownEscape: Story = {
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Edit category" }));
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
    await waitFor(() => expect(canvas.getByText("Price proposals")).toBeVisible());
    await expect(canvas.getByText(/USD\/JPY strengthened/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Approve" })).toBeVisible();
    await new Promise(resolve => setTimeout(resolve, 300));
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

export const StructuredVariantOptions: Story = {
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText(/Option \(Color/), "Color");
    await userEvent.type(canvas.getByPlaceholderText(/Value \(Blue/), "Blue");
    await userEvent.click(canvas.getByRole("button", { name: "Add option" }));
    await expect(canvas.getByRole("button", { name: "Color: Blue ×" })).toBeVisible();

    await userEvent.type(canvas.getByPlaceholderText("Variant label"), "Blue large");
    await userEvent.type(canvas.getByPlaceholderText("Product price"), "12");
    await userEvent.click(canvas.getByRole("button", { name: "Add variant" }));
    await expect(canvas.getByText("Color: Blue")).toBeVisible();
  },
};

export const MobileTabNavigation: Story = {
  globals: { theme: "dark", viewport: { value: "mobileSmall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit product" })).toBeVisible());

    const nav = canvasElement.querySelector(".halloween-admin-header nav");
    await expect(nav).not.toBeNull();
    await expect(nav!.scrollWidth).toBeGreaterThan(nav!.clientWidth);
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientWidth,
    );

    for (const action of ["add", "edit", "delete", "pricing", "categories"]) {
      const actionButton = canvasElement.querySelector<HTMLButtonElement>(`[data-cy='admin-action-${action}']`);
      await expect(actionButton).not.toBeNull();
      await userEvent.click(actionButton!);
      await expect(actionButton).toHaveAttribute("aria-pressed", "true");
    }

    const closeButton = canvasElement.querySelector<HTMLButtonElement>("[data-cy='admin-panel-close']");
    await expect(closeButton).not.toBeNull();
    await userEvent.click(closeButton!);
    await waitFor(() => expect(closeButton).not.toBeVisible());
  },
};
