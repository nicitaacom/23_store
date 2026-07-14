import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useForm } from "react-hook-form";

import { BaseInput } from "@/components/ui/Inputs/BaseInput";
import { FormInput } from "@/components/ui/Inputs/Validation/FormInput";
import { Input } from "@/components/ui/Inputs/Input";
import { SearchInput } from "@/components/ui/Inputs/SearchInput";

interface IValidationForm {
  username: string;
  email: string;
  emailOrUsername?: string;
  password: string;
}

function InputMatrix() {
  const [inputValue, setInputValue] = useState("Joki");

  return (
    <div className="grid max-w-lg gap-3 p-3">
      <label className="grid gap-1 text-sm text-title">Base input<BaseInput placeholder="Base input" /></label>
      <label className="grid gap-1 text-sm text-title">
        Controlled input
        <Input value={inputValue} onChange={event => setInputValue(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm text-title">
        Search
        <SearchInput aria-label="Search products" startIcon={<FiSearch />} placeholder="Search products" />
      </label>
      <label className="grid gap-1 text-sm text-title">Disabled<BaseInput disabled value="Unavailable" readOnly /></label>
    </div>
  );
}

function ValidationForm() {
  const { register, formState: { errors }, handleSubmit } = useForm<IValidationForm>({
    defaultValues: { email: "", password: "", username: "" },
  });

  function submitForm() {
    return undefined;
  }

  return (
    <form className="grid max-w-md gap-3 p-3" onSubmit={handleSubmit(submitForm)}>
      <FormInput id="email" label="Email" placeholder="name@example.com" register={register} errors={errors} required />
      <FormInput id="password" label="Password" type="password" register={register} errors={errors} required />
      <button className="h-8 rounded border border-brand bg-brand/10 px-3 text-sm text-brand" type="submit">Validate</button>
    </form>
  );
}

const meta = {
  title: "UI/Inputs/Text inputs",
  component: BaseInput,
} satisfies Meta<typeof BaseInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = { render: InputMatrix };
export const Validation: Story = {
  render: ValidationForm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const validateButton = await waitFor(() => canvas.getByRole("button", { name: "Validate" }));
    await userEvent.click(validateButton);
    await expect(canvas.getAllByText("This field is required")).toHaveLength(2);

    await userEvent.type(canvas.getByRole("textbox", { name: /Email/ }), "invalid");
    await userEvent.type(canvas.getByLabelText(/Password/), "weak");
    await userEvent.click(canvas.getByRole("button", { name: "Validate" }));
    await expect(canvas.getByText("Enter valid email address")).toBeVisible();
  },
};

export const SearchKeyboardFocus: Story = {
  render: InputMatrix,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = await waitFor(() => canvas.getByRole("textbox", { name: "Search products" }));
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "headphones");
    await expect(searchInput).toHaveValue("headphones");
    await expect(searchInput).toHaveFocus();
  },
};
