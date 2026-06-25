Components should do rendering only.

```tsx
"use client"

import { useRef } from "react"
import { twMerge } from "tailwind-merge"
import { FiClock } from "react-icons/fi"

import { useSetSomething } from "./hooks/useSetSomething"

interface SomethingProps {
  className?: string
  title: string
}

export function Something({ className, title }: SomethingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isLoading, handleToggle, refetch } = useSetSomething()

  const { handleRename, handleDelete } = useSomethingHandlers()

  return (
    <div className={twMerge("relative space-y-2", className)} ref={containerRef}>
      <button className="flex items-center gap-2" onClick={handleToggle}>
        <FiClock size={14} />
        <span>{title}</span>
        <button onClick={handleRename}>rename</button>
        <button onClick={handleDelete}>delete</button>
      </button>
    </div>
  )
}
```
