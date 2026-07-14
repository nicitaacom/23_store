import { FiArrowRight, FiShoppingCart } from "react-icons/fi";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Button, type ButtonProps } from "@/components/ui/Button";

const variants: NonNullable<ButtonProps["variant"]>[] = [
  "default",
  "default-outline",
  "primary",
  "primary-outline",
  "secondary",
  "secondary-outline",
  "info",
  "info-outline",
  "warning",
  "warning-outline",
  "danger",
  "danger-outline",
  "success",
  "success-outline",
  "ghost",
  "link",
  "gradient",
  "nav-link",
  "icon",
  "continue-with",
];

const sizes: NonNullable<ButtonProps["size"]>[] = ["xs", "sm", "md", "lg", "xl"];

function ButtonVariants() {
  return (
    <div className="grid grid-cols-2 gap-2 p-3 tablet:grid-cols-4">
      {variants.map(variant => (
        <Button key={variant} variant={variant}>{variant}</Button>
      ))}
    </div>
  );
}

function ButtonSizes() {
  return (
    <div className="flex flex-wrap items-end gap-2 p-3">
      {sizes.map(size => <Button key={size} size={size}>{size}</Button>)}
      <Button aria-label="Cart" size="icon-md" variant="icon"><FiShoppingCart /></Button>
    </div>
  );
}

function ButtonStates() {
  return (
    <div className="grid max-w-md gap-2 p-3">
      <Button leftIcon={<FiShoppingCart />}>Icon on left</Button>
      <Button rightIcon={<FiArrowRight />}>Icon on right</Button>
      <Button loading loadingText="Updating">Pending</Button>
      <Button disabled>Disabled</Button>
      <Button fullWidth>Full width</Button>
      <Button href="/en/products" variant="link">Product link</Button>
    </div>
  );
}

const meta = {
  title: "UI/Buttons/Button",
  component: Button,
  args: {
    children: "Add to cart",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Variants: Story = { render: ButtonVariants };
export const Sizes: Story = { render: ButtonSizes };
export const States: Story = { render: ButtonStates };
export const KeyboardActivation: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByRole("button", { name: "Add to cart" }));

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const DisabledBehavior: Story = {
  args: { disabled: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByRole("button", { name: "Add to cart" }));
    await expect(button).toBeDisabled();
    await userEvent.tab();
    await expect(button).not.toHaveFocus();
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
