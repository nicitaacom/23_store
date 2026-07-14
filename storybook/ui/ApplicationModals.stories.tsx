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
    useUser.setState({ user: customerUser });
    useUpdateAvatarModal.getState().openModal(FIXTURE_IMAGES.avatar);
  }, []);

  return <UpdateAvatarModal />;
}

const meta = {
  title: "UI/Overlays/Application modals",
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
export const AvatarUpdate: Story = { render: AvatarModalExample };
