import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { fixtureCategories } from "../fixtures";
import { AdminPanelModal } from "@/components/ui/Modals/AdminPanel/AdminPanelModal";

const meta = {
  title: "Admin/AdminPanelModal",
  component: AdminPanelModal,
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
