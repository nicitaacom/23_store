"use client"

import { motion } from "framer-motion"
import { AiOutlineCheckCircle, AiOutlineWarning } from "react-icons/ai"
import { BiErrorCircle } from "react-icons/bi"
import { Button } from "."
import useToast, { ToastVariant } from "@/store/ui/useToast"
import { useI18n } from "@/locales/client"

export default function Toast() {
  const { variant, title, subTitle } = useToast()
  const t = useI18n()

  const variantConfig: Record<
    ToastVariant,
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
          <Button className="inline-block text-info" variant="link" href="t.me/nicitaacom">
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
      className={`fixed right-[2%] bottom-[2%] border-[1px] ${currentConfig.borderColor}
          bg-foreground flex gap-x-4 w-auto max-w-[30%] rounded-lg px-4 py-2 z-[4999]`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}>
      <div className={`flex items-center ${currentConfig.iconColor}`}>{currentConfig.icon}</div>

      <div className="flex flex-col w-full">
        <div className="text-title font-bold">
          <h1 className="whitespace-pre-wrap">{title || currentConfig.defaultTitle}</h1>
        </div>

        <div className="text-subTitle whitespace-pre-wrap">{subTitle || currentConfig.defaultSubtitle}</div>
      </div>
    </motion.div>
  )
}
