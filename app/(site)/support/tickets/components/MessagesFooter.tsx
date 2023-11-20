export function MessagesFooter() {
  async function sendMessage(formData: FormData) {
    "use server"
    const inputValue = formData.get("message")?.toString()

    // TODO - send message logic
  }

  return (
    <form className="w-full p-4 bg-foreground" action={sendMessage}>
      <input
        className="w-full rounded border border-solid bg-transparent px-4 py-2 mb-1 outline-none text-title"
        type="text"
        name="message"
        placeholder="Enter message..."
      />
    </form>
  )
}
