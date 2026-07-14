import { useForm } from "react-hook-form"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import type { IAuthFormData } from "@/ts/interfaces/IAuthFormData"
import { AuthForm } from "@/[locale]/(auth)/AuthModal/components/AuthForm"
import { OpenAuthModalButton } from "@/components/Navbar/components/OpenAuthModalButton"
import { Timer } from "@/[locale]/(auth)/AuthModal/components/Timer"

type AuthVariant = "login" | "recover" | "register" | "resetPassword"

interface AuthExampleProps {
  isEmailSent: boolean
  isSubmitting: boolean
  onSubmit: (data: IAuthFormData) => Promise<void>
  responseMessage: string | null
  variant: AuthVariant
}

function AuthExample({ isEmailSent, isSubmitting, onSubmit, responseMessage, variant }: AuthExampleProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<IAuthFormData>()

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border-color bg-foreground p-6 shadow-compact">
      <h1 className="mb-5 text-center text-2xl font-semibold text-title">
        {variant === "register" ? "Create account" : variant === "login" ? "Sign in" : "Password recovery"}
      </h1>
      <AuthForm
        errors={errors}
        handleSubmit={handleSubmit}
        isEmailSent={isEmailSent}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        queryParams={variant}
        register={register}
        responseMessage={responseMessage}
      />
    </div>
  )
}

function VerificationTimerExample({ action }: { action: () => void }) {
  return (
    <div className="p-6">
      <Timer action={action} label="Resend available in" seconds={0}>
        <button className="text-brand underline" type="button">
          Resend verification
        </button>
      </Timer>
    </div>
  )
}

function AnonymousPrompt() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-color bg-foreground p-5">
      <p>Sign in to continue with this protected action.</p>
      <OpenAuthModalButton />
    </div>
  )
}

const meta = {
  title: "Authentication/Auth form",
  component: AuthExample,
  args: {
    isEmailSent: false,
    isSubmitting: false,
    onSubmit: fn(async () => undefined),
    responseMessage: null,
    variant: "login",
  },
  parameters: {
    nextjs: { navigation: { pathname: "/en", segments: [["locale", "en"]] } },
  },
} satisfies Meta<typeof AuthExample>

export default meta
type Story = StoryObj<typeof meta>

export const SignIn: Story = {}
export const Registration: Story = { args: { variant: "register" } }
export const PasswordRecovery: Story = { args: { variant: "recover" } }
export const PasswordReset: Story = { args: { variant: "resetPassword" } }
export const OAuthChoices: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByAltText(/continue with google/i)).toBeVisible()
    await expect(canvas.getByAltText(/continue with faceit/i)).toBeVisible()
    await expect(canvas.getByAltText(/continue with twitter/i)).toBeVisible()
  },
}
export const PendingRequest: Story = { args: { isSubmitting: true } }
export const BackendRejection: Story = { args: { responseMessage: "The supplied credentials were rejected." } }
export const EmailSent: Story = { args: { isEmailSent: true, responseMessage: "Check your inbox to continue." } }

export const ValidationFailures: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: /sign in/i }))
    await expect(await canvas.findByText(/email.*required|required.*email/i)).toBeVisible()
    await expect(canvas.getByText(/password.*required|required.*password/i)).toBeVisible()
  },
}

export const SubmissionArguments: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByLabelText(/email/i), "customer@example.test")
    await userEvent.type(canvas.getByLabelText(/password/i), "StrongPass1")
    await userEvent.click(canvas.getByRole("button", { name: /sign in/i }))
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        {
          email: "customer@example.test",
          password: "StrongPass1",
        },
        expect.anything(),
      ),
    )
  },
}

export const VerificationTimer: Story = {
  args: { onSubmit: fn(async () => undefined) },
  render: args => <VerificationTimerExample action={args.onSubmit as unknown as () => void} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("button", { name: "Resend verification" })).toBeVisible()
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce())
  },
}

export const AuthenticatedRedirect: Story = {
  render: () => (
    <p className="p-6" role="status">
      Authenticated users are redirected away from the authentication modal.
    </p>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("redirected")
  },
}

export const AnonymousProtectedAction: Story = {
  render: AnonymousPrompt,
  play: async ({ canvasElement }) => {
    const findByRoleResp = await within(canvasElement).findByRole("link", { name: "login" })
    await expect(findByRoleResp).toHaveAttribute("href", "/en?modal=AuthModal&variant=login")
  },
}
