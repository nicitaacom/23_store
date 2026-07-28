import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";

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
