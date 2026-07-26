import { useLayoutEffect } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { TToastVariant } from "@/ts/types/TToastVariant";
import { FIXTURE_IMAGES } from "../fixtures";
import useToast from "@/store/ui/useToast";
import { Button } from "@/components/ui/Button";
import EmptyCart from "@/components/ui/Modals/CartModal/EmptyCart";
import { FormSkeleton } from "@/components/Skeletons/FormSkeleton";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import Toast from "@/components/ui/Toast";

function ToastExample({ variant }: { variant: TToastVariant }) {
  const closeToast = useToast(store => store.close);
  const isOpen = useToast(store => store.isOpen);

  useLayoutEffect(() => {
    useToast.getState().show(variant, `${variant} notification`, "A stable Storybook notification.", 0);
  }, [variant]);

  return (
    <div className="min-h-48 p-3">
      <Button onClick={closeToast} variant="secondary-outline">Dismiss notification</Button>
      {isOpen && <Toast />}
    </div>
  );
}

function ImageStates() {
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      <figure className="rounded border border-border-color bg-foreground/5 p-2">
        <ImageWithFallback alt="Available product" height={180} src={FIXTURE_IMAGES.product} width={240} />
        <figcaption className="mt-2 text-sm text-title">Loaded image</figcaption>
      </figure>
      <figure className="rounded border border-border-color bg-foreground/5 p-2">
        <ImageWithFallback
          alt="Unavailable product"
          fallbackClassName="h-40 w-full object-contain"
          fallbackWrapperClassName="grid gap-1"
          height={180}
          showLabel
          src={undefined}
          width={240} />
        <figcaption className="mt-2 text-sm text-title">Fallback image</figcaption>
      </figure>
    </div>
  );
}

function SkeletonStates() {
  return (
    <div className="grid max-w-lg gap-2 p-3" aria-label="Loading form">
      <FormSkeleton count={4} />
    </div>
  );
}

function PendingAndFailure() {
  return (
    <div className="grid max-w-lg gap-3 p-3">
      <div className="rounded border border-border-color bg-foreground/5 p-3">
        <h2 className="text-sm font-semibold text-title">Pending request</h2>
        <Button className="mt-2" loading loadingText="Updating price">Update price</Button>
      </div>
      <div className="rounded border border-danger bg-danger/10 p-3" role="alert">
        <h2 className="text-sm font-semibold text-danger">Request failed</h2>
        <p className="mt-1 text-sm text-subTitle">The confirmed value is still shown. Try again.</p>
      </div>
    </div>
  );
}

const meta = {
  title: "UI/Feedback/ToastExample",
  component: ToastExample,
  args: { variant: "success" },
} satisfies Meta<typeof ToastExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SuccessToast: Story = {};
export const WarningToast: Story = { args: { variant: "warning" } };
export const ErrorToast: Story = { args: { variant: "error" } };
export const DismissToast: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("success notification")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(canvas.queryByText("success notification")).not.toBeInTheDocument());
  },
};
export const Images: Story = { render: ImageStates };
export const Skeletons: Story = { render: SkeletonStates };
export const EmptyState: Story = { render: EmptyCart };
export const PendingFailure: Story = { render: PendingAndFailure };
