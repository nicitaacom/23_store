import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AdminPanelModal } from "@/components/ui/Modals/AdminPanel/AdminPanelModal";

const meta = {
  title: "Admin/AdminPanelModal",
  component: AdminPanelModal,
  parameters: {
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
