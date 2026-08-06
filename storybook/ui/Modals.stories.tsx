import { useLayoutEffect, useState } from "react";
import { BiTrash } from "react-icons/bi";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { useLoading } from "@/store/ui/useLoading";
import { AreYouSureModalContainer } from "@/components/ui/Modals/ModalContainers/AreYouSureModalContainer";
import { Button } from "@/components/ui/Button";
import { ModalContainer } from "@/components/ui/Modals/ModalContainers/ModalContainer";
import { ModalQueryContainer } from "@/components/ui/Modals/ModalContainers/ModalQueryContainer";

interface IModalExampleProps {
  initialOpen?: boolean;
  pending?: boolean;
}

function ModalExample({ initialOpen = true, pending = false }: IModalExampleProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  useLayoutEffect(() => {
    useLoading.setState({ isLoading: pending });
    return () => useLoading.setState({ isLoading: false });
  }, [pending]);

  return (
    <div className="p-3">
      <Button onClick={() => setIsOpen(true)}>Open modal</Button>
      <ModalContainer isOpen={isOpen} label="Account settings" onClose={() => setIsOpen(false)}>
        <p className="text-sm text-subTitle">Modal content remains isolated from application services.</p>
        <Button loading={pending} loadingText="Updating account">Update account</Button>
      </ModalContainer>
    </div>
  );
}

function ConfirmationExample({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [isOpen, setIsOpen] = useState(true);

  function cancelConfirmation() {
    onCancel();
    setIsOpen(false);
  }

  function confirmDeletion() {
    onConfirm();
    setIsOpen(false);
  }

  return (
    <AreYouSureModalContainer
      isOpen={isOpen}
      label="Delete Joki wireless headphones?"
      subTitle="This action permanently removes the product."
      primaryButtonAction={confirmDeletion}
      primaryButtonIcon={BiTrash}
      primaryButtonLabel="Delete product"
      primaryButtonVariant="danger"
      secondaryButtonAction={cancelConfirmation}
      secondaryButtonLabel="Cancel" />
  );
}

function QueryModalExample() {
  return (
    <ModalQueryContainer modalQuery="storybook-example">
      <p className="text-sm text-subTitle">Modal content remains isolated from application services.</p>
    </ModalQueryContainer>
  );
}

const meta = {
  title: "UI/Overlays/Modal containers/ModalContainer",
  component: ModalExample,
} satisfies Meta<typeof ModalExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const FocusEscapeAndReturn: Story = {
  args: { initialOpen: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const launchButton = await waitFor(() => canvas.getByRole("button", { name: "Open modal" }));
    await userEvent.click(launchButton);
    const closeButton = await waitFor(() => canvas.getByRole("button", { name: "Close modal" }));
    await waitFor(() => expect(closeButton).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(launchButton).toHaveFocus();
  },
};
export const OutsideClick: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await waitFor(() => canvas.getByRole("dialog", { name: "Account settings" }));
    const backdrop = dialog.parentElement;
    if (!backdrop) throw new Error("Modal backdrop was not rendered");
    await userEvent.pointer([{ target: backdrop, keys: "[MouseLeft>]" }, { target: backdrop, keys: "[/MouseLeft]" }]);
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};
export const PendingProtection: Story = {
  args: { pending: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = await waitFor(() => canvas.getByRole("button", { name: "Close modal" }));
    await expect(closeButton).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.getByRole("dialog")).toBeVisible());
  },
};
export const DestructiveConfirmation: Story = {
  render: function RenderConfirmation() {
    return <ConfirmationExample onCancel={fn()} onConfirm={fn()} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButton = await waitFor(() => canvas.getByRole("button", { name: /Delete product/ }));
    await waitFor(() => expect(deleteButton).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const ConfirmationClosesOnEscape: Story = {
  render: function RenderConfirmation() {
    return <ConfirmationExample onCancel={fn()} onConfirm={fn()} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("dialog")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const ConfirmationClosesOnOutsideClick: Story = {
  render: function RenderConfirmation() {
    return <ConfirmationExample onCancel={fn()} onConfirm={fn()} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await waitFor(() => canvas.getByRole("dialog"));
    const backdrop = dialog.parentElement;
    if (!backdrop) throw new Error("Modal backdrop was not rendered");
    await userEvent.click(backdrop);
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

const queryModalParameters = { nextjs: { navigation: { pathname: "/en", query: { modal: "storybook-example" } } } };

export const QueryModalClosesOnEscape: Story = {
  render: QueryModalExample,
  parameters: queryModalParameters,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText(/Modal content remains isolated/)).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByText(/Modal content remains isolated/)).not.toBeInTheDocument(), {
      timeout: 3000,
    });
  },
};

export const QueryModalClosesOnOutsideClick: Story = {
  render: QueryModalExample,
  parameters: queryModalParameters,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const content = await waitFor(() => canvas.getByText(/Modal content remains isolated/));
    const backdrop = content.closest(".fixed.inset-0");
    if (!backdrop) throw new Error("Modal backdrop was not rendered");
    await userEvent.click(backdrop);
    await waitFor(() => expect(canvas.queryByText(/Modal content remains isolated/)).not.toBeInTheDocument(), {
      timeout: 3000,
    });
  },
};
