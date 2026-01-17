"use client"

import { motion, AnimatePresence } from "framer-motion"
import { BsStars } from "react-icons/bs"
import { MessageBoxAI } from "./MessageBoxAI"
import { TAIChatMessage } from "@/TS/types/TAIChatMessage"

type Props = { conversation: TAIChatMessage[]; isLoading: boolean; chatEndRef: React.RefObject<HTMLDivElement> }

export function ChatMessages({ conversation, isLoading, chatEndRef }: Props) {
  return (
    <div className="rounded-xl border border-border-color bg-foreground-accent/30 backdrop-blur-sm overflow-hidden">
      <div className="flex flex-col gap-3 p-4 min-h-[420px] max-h-[520px] overflow-y-auto">
        {conversation.length === 0 && <EmptyState />}

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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
      <div className="p-3 rounded-full bg-success/10 border border-success/20">
        <BsStars className="text-3xl text-success" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-title font-semibold">Ready to help you shop</p>
        <p className="text-subTitle text-sm max-w-sm">
          Describe what you&apos;re looking for and I&apos;ll guide you to the perfect product
        </p>
      </div>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start">
      <div className="px-4 py-3 rounded-lg bg-foreground-accent border border-border-color">
        <div className="flex gap-1.5">
          {[0, 200, 400].map(delay => (
            <motion.span
              key={delay}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: delay / 1000 }}
              className="w-2 h-2 rounded-full bg-subTitle"
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
