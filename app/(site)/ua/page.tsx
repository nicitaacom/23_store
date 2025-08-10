import { Button } from "@/components/ui"

export default function Page() {
  return (
    <div className="flex flex-col gap-y-4 justify-center items-center pt-32">
      <h1 className="text-2xl text-center">
        If you know how to create i18n without changing path (route) - send me an email: nicitaacom@gmail.com
      </h1>
      <Button href="https://github.com/i18next/next-i18next/discussions/2223">
        https://github.com/i18next/next-i18next/discussions/2223
      </Button>
    </div>
  )
}
