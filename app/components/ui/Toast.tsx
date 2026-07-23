"use client"

import { motion } from "framer-motion"
import { AiOutlineCheckCircle, AiOutlineWarning } from "react-icons/ai"
import { BiErrorCircle } from "react-icons/bi"

import { TToastVariant } from "@/ts/types/TToastVariant"
import { Button } from "."
import { useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"

export default function Toast() {
  const { variant, title, subTitle } = useToast()
  const t = useI18n()

  const variantConfig: Record<
    TToastVariant,
    {
      icon: React.ReactNode
      borderColor: string
      iconColor: string
      defaultTitle: string
      defaultSubtitle?: React.ReactNode
    }
  > = {
    success: {
      icon: <AiOutlineCheckCircle size={32} />,
      borderColor: "border-success",
      iconColor: "text-success",
      defaultTitle: t("toast.success.title"),
      defaultSubtitle: <p>{t("toast.success.subtitle")}</p>,
    },
    error: {
      icon: <BiErrorCircle size={32} />,
      borderColor: "border-danger",
      iconColor: "text-danger",
      defaultTitle: t("toast.error.title"),
      defaultSubtitle: (
        <p className="flex flex-wrap">
          {t("toast.error.subtitle")} -&nbsp;
          <Button className="inline-block text-info" variant="link" href={process.env.NEXT_PUBLIC_TELEGRAM_URL}>
            {t("toast.error.button")}
          </Button>
        </p>
      ),
    },
    warning: {
      icon: <AiOutlineWarning size={32} />,
      borderColor: "border-warning",
      iconColor: "text-warning",
      defaultTitle: t("toast.warning.title"),
      defaultSubtitle: <p>{t("toast.warning.subtitle")}</p>,
    },
  }

  const currentConfig = variantConfig[variant] || variantConfig.error

  return (
    <motion.div
      className={`fixed bottom-[2%] right-[2%] z-[4999] flex w-auto max-w-[min(92vw,420px)] gap-3 rounded
        border ${currentConfig.borderColor} bg-foreground/95 px-3 py-2 shadow-compact`}
      data-click-outside-ignore
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}>
      <div className={`flex items-center ${currentConfig.iconColor}`}>{currentConfig.icon}</div>

      <div className="flex w-full flex-col gap-0.5">
        <div className="font-semibold text-title">
          <h1 className="whitespace-pre-wrap">{title || currentConfig.defaultTitle}</h1>
        </div>

        <div className="whitespace-pre-wrap text-sm text-subTitle">{subTitle || currentConfig.defaultSubtitle}</div>
      </div>
    </motion.div>
  )
}
