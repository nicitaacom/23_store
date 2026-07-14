import { useLayoutEffect, useRef, useState } from "react";
import { FiMoreHorizontal, FiShoppingBag, FiUser } from "react-icons/fi";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { FIXTURE_IDS, FIXTURE_IMAGES } from "../fixtures";
import useCartStore from "@/store/user/cartStore";
import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { DropdownContainer } from "@/components/ui/DropdownContainer";
import { DropdownItem } from "@/components/ui/DropdownItem";
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RadioButton } from "@/components/ui/RadioButton";
import { Slider } from "@/components/ui/Slider";

function SelectionControls() {
  const [isChecked, setIsChecked] = useState(false);
  const [delivery, setDelivery] = useState("standard");

  return (
    <div className="grid max-w-md gap-3 p-3">
      <Checkbox isChecked={isChecked} label="Remember my choice" onChange={() => setIsChecked(current => !current)} />
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1 text-sm text-title">Delivery</legend>
        <RadioButton checked={delivery === "standard"} inputName="delivery" label="standard" onChange={event => setDelivery(event.target.value)}>Standard</RadioButton>
        <RadioButton checked={delivery === "express"} inputName="delivery" label="express" onChange={event => setDelivery(event.target.value)}>Express</RadioButton>
      </fieldset>
    </div>
  );
}

function ProgressStates() {
  return (
    <div className="grid max-w-lg gap-3 p-3">
      <ProgressBar label="Waiting" value={0} />
      <ProgressBar label="Uploading" value={0.48} />
      <ProgressBar label="Complete" value={1} />
    </div>
  );
}

function ProductQuantityControl() {
  const cartKey = `${FIXTURE_IDS.product}::${FIXTURE_IDS.variant}`;
  const quantity = useCartStore(store => store.products[cartKey]?.quantity ?? 0);

  useLayoutEffect(() => {
    useCartStore.setState({
      products: { [cartKey]: { id: FIXTURE_IDS.product, quantity: 1, variantId: FIXTURE_IDS.variant } },
      productsData: [],
    });
  }, [cartKey]);

  return (
    <div className="flex items-center gap-2 p-3">
      <div className="flex overflow-hidden rounded border border-border-color">
        <ProductQuantityButton action="decrease" productId={FIXTURE_IDS.product} variantId={FIXTURE_IDS.variant} />
        <output aria-label="Quantity" className="flex min-w-8 items-center justify-center bg-background text-sm text-title">{quantity}</output>
        <ProductQuantityButton action="increase" productId={FIXTURE_IDS.product} variantId={FIXTURE_IDS.variant} />
      </div>
      <ProductQuantityButton action="clear" productId={FIXTURE_IDS.product} variantId={FIXTURE_IDS.variant} />
      <AddToCartButton productId="product-new-23" />
    </div>
  );
}

function DropdownExample() {
  const [isDropdown, setIsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex justify-end p-3">
      <DropdownContainer
        dropdownRef={dropdownRef}
        icon={<button aria-label="Open actions" className="h-8 w-8 rounded border border-border-color"><FiMoreHorizontal /></button>}
        isDropdown={isDropdown}
        toggle={() => setIsDropdown(current => !current)}>
        <ul>
          <DropdownItem icon={FiUser} label="Profile" />
          <DropdownItem icon={FiShoppingBag} label="Orders" href="/en/orders" />
        </ul>
      </DropdownContainer>
    </div>
  );
}

function ProductSlider() {
  return (
    <div className="h-64 w-80 p-3">
      <Slider
        height={240}
        images={[
          { src: FIXTURE_IMAGES.product, alt: "Joki headphones" },
          { src: FIXTURE_IMAGES.productAlternative, alt: "Alternative product" },
        ]}
        width={320}
        emulateTouch
        swipeable />
    </div>
  );
}

const meta = {
  title: "UI/Controls/Control collection",
  component: SelectionControls,
} satisfies Meta<typeof SelectionControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = await waitFor(() => canvas.getByRole("checkbox", { name: "Remember my choice" }));
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Express" }));
    await expect(canvas.getByRole("radio", { name: "Express" })).toBeChecked();
  },
};
export const Progress: Story = { render: ProgressStates };
export const QuantityAndCart: Story = {
  render: ProductQuantityControl,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("1"));
    await userEvent.click(canvas.getByRole("button", { name: "+" }));
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("2"));
    await userEvent.click(canvas.getByRole("button", { name: "−" }));
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("1"));
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(canvas.getByLabelText("Quantity")).toHaveTextContent("0"));
    await userEvent.click(canvas.getByRole("button", { name: /add to cart/i }));
    await expect(useCartStore.getState().products["product-new-23"]).toMatchObject({ quantity: 1 });
  },
};
export const Dropdown: Story = {
  render: DropdownExample,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const actionsButton = await waitFor(() => canvas.getByRole("button", { name: "Open actions" }));
    await userEvent.click(actionsButton);
    await waitFor(() => expect(canvas.getByText("Profile")).toBeVisible());
  },
};
export const ImageSlider: Story = { render: ProductSlider };
