"use client"

import { UseFormRegister } from "react-hook-form"
import { twMerge } from "tailwind-merge"

interface FormData {
  message: string
}

interface MessageInputProps {
  id: keyof FormData
  register: UseFormRegister<FormData>
  className?: string
}

export function MessageInput({ className, id, register }: MessageInputProps) {
  return (
    <div className="w-[calc(100%-2px)] bg-foreground-accent p-4">
      <input
        className={twMerge(
          `w-full rounded border border-solid bg-transparent px-4 py-2 mb-1 outline-none text-title`,
          className,
        )}
        id={id}
        tabIndex={0}
        placeholder="Enter message..."
        {...register(id)}
      />
    </div>
  )
}
