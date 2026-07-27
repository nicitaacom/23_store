"use client"

import { motion, AnimatePresence } from "framer-motion"
import { BsStars } from "react-icons/bs"

import { TAIChatMessage } from "@/ts/types/TAIChatMessage"
import { MessageBoxAI } from "./MessageBoxAI"
import { useScopedI18n } from "@/locales/client"

type Props = { conversation: TAIChatMessage[]; isLoading: boolean; chatEndRef: React.RefObject<HTMLDivElement> }

// http://localhost:6006/?path=/story/commerce-aisearch--search-entry-point
export function ChatMessages({ conversation, isLoading, chatEndRef }: Props) {
  const t = useScopedI18n("aichat")
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border-color bg-foreground-accent/30 backdrop-blur-sm">
      <div className="flex h-full min-h-[360px] flex-col gap-3 overflow-y-auto p-4">
        {conversation.length === 0 && <EmptyState title={t("emptystate.title")} subtitle={t("emptystate.subtitle")} />}

        <AnimatePresence mode="popLayout">
          {conversation.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}>
              <MessageBoxAI role={message.role} text={message.text} imageUrl={message.imageUrl} />
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && <LoadingIndicator />}

        <div ref={chatEndRef} />
      </div>
    </div>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
      <div className="p-3 rounded-full bg-success/10 border border-success/20">
        <BsStars className="text-3xl text-success" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-title font-semibold">{title}</p>
        <p className="text-subTitle text-sm max-w-sm">{subtitle}</p>
      </div>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <motion.div
      className="flex justify-start"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <div className="px-4 py-3 rounded-lg bg-foreground-accent border border-border-color">
        <div className="flex gap-1.5">
          {[0, 200, 400].map(delay => (
            <motion.span
              className="w-2 h-2 rounded-full bg-subTitle"
              key={delay}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: delay / 1000 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
