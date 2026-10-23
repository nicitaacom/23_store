import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { MarkdownEditor } from "@/components/ui/Inputs/MarkdownEditor";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { MessageInput } from "@/components/ui/Inputs/MessageInput";

function MarkdownExample() {
  const [markdownValue, setMarkdownValue] = useState("**Balanced sound**\n* Comfortable fit\n_Three year warranty_");

  return (
    <div className="grid gap-3 bg-modal-surface p-3 tablet:grid-cols-2">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-title">Editor</h2>
        <MarkdownEditor value={markdownValue} onChange={setMarkdownValue} placeholder="Describe the product" />
      </div>
      <div className="rounded border border-border-color bg-background p-3">
        <h2 className="mb-2 text-sm font-semibold text-title">Rendered markdown</h2>
        <MarkdownText text={markdownValue} />
      </div>
    </div>
  );
}

const meta = {
  title: "UI/Inputs/MessageInput",
  component: MessageInput,
  args: {
    onSend: fn(async () => undefined),
    placeholder: "Type a message",
  },
} satisfies Meta<typeof MessageInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Message: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const messageInput = await waitFor(() => canvas.getByPlaceholderText("Type a message"));
    const sendButton = canvas.getByRole("button");

    await expect(sendButton).toBeDisabled();
    await userEvent.type(messageInput, "Please reserve the black variant");
    await userEvent.keyboard("{Enter}");
    await expect(args.onSend).toHaveBeenCalledWith("Please reserve the black variant", null);
    await expect(messageInput).toHaveValue("");
  },
};

export const Markdown: Story = { render: MarkdownExample };

export const MarkdownSaveChord: Story = {
  render: function MarkdownSaveChordExample() {
    const [savedLabel, setSavedLabel] = useState("");
    return (
      <div className="bg-modal-surface p-3">
        <MarkdownEditor value="Hello snack" onChange={fn()} onSaveChord={() => setSavedLabel("saved")} />
        <output>{savedLabel}</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const editor = await waitFor(() => {
      const node = canvasElement.querySelector("[contenteditable='true']");
      if (!(node instanceof HTMLElement)) throw new Error("Editor is missing");
      return node;
    });
    editor.focus();
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await expect(await within(canvasElement).findByText("saved")).toBeVisible();
  },
};

export const DisabledMarkdown: Story = {
  render: function DisabledMarkdownExample() {
    return <div className="bg-modal-surface p-3"><MarkdownEditor disabled value="**Read only**" onChange={fn()} /></div>;
  },
};
