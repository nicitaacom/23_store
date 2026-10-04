import { useLayoutEffect } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { FIXTURE_IMAGES, customerUser } from "../fixtures";
import { useCtrlKModal } from "@/store/ui/useCtrlKModal";
import { useUpdateAvatarModal } from "@/store/ui/useUpdateAvatarModal";
import useUser from "@/store/user/useUser";
import { CtrlKModal } from "@/components/ui/Modals/CtrlKModal";
import { UpdateAvatarModal } from "@/components/ui/Modals/UpdateAvatarModal";

function SearchModalExample() {
  useLayoutEffect(() => {
    useCtrlKModal.getState().openModal();
  }, []);

  return <CtrlKModal locale="en" />;
}

function AvatarModalExample() {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = "default";
    useUser.setState({ user: customerUser });
    useUpdateAvatarModal.getState().openModal(FIXTURE_IMAGES.avatar);
  }, []);

  return <UpdateAvatarModal />;
}

const meta = {
  title: "UI/Overlays/Application modals/CtrlKModal",
  component: SearchModalExample,
} satisfies Meta<typeof SearchModalExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Search: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = await waitFor(() => canvas.getByRole("searchbox"));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Close modal" })).toHaveFocus());
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "headphones");
    await expect(searchInput).toHaveValue("headphones");
    await userEvent.keyboard("{Escape}");
    await expect(searchInput).not.toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};
export const AvatarUpdate: Story = { render: AvatarModalExample, globals: { theme: "dark" } };
export const AvatarUpdateMobileControls: Story = {
  render: AvatarModalExample,
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobileSmall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const controls = [
      await canvas.findByRole("button", { name: "Close modal" }),
      await canvas.findByRole("button", { name: /click or drop avatar here/i }),
      await canvas.findByRole("textbox", { name: "Avatar URL" }),
      await canvas.findByRole("button", { name: "Use provider avatar" }),
      await canvas.findByRole("button", { name: "Save avatar" }),
    ]

    for (const control of controls) {
      const bounds = control.getBoundingClientRect()
      await expect(Math.round(bounds.width)).toBeGreaterThanOrEqual(44)
      await expect(Math.round(bounds.height)).toBeGreaterThanOrEqual(44)
    }

    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  },
}
