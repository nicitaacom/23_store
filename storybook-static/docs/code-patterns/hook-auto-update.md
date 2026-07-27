### hook-auto-update

hook-auto-update

Use this when a hook must sync store data into a form and autosave changes back to backend.

Core idea:

sync store → form only after data is loaded
delay autosave arming until the form has real values
debounce the save
read fresh state at save time
re-verify dirty state inside saveFn
use a ref for the latest save function

Rules for any autosave hook
Do not arm autosave before the store has loaded real data.
Do not trust the closure inside the delayed save.
Read fresh values inside saveFn with .getState() or equivalent.
Keep saveFn deps small.
Guard against double saves with isSavingRef.
Re-check dirty state inside saveFn before writing.
Mental model
Effect 1 syncs store into the form.
Effect 2 enables autosave only after the form is truly hydrated.
Autosave effect only triggers the save.
saveFn is the last line of defense and must use fresh state.

hook auto-update example

````ts
"use client"

import { useCallback, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/useDebounde"

export function useAutoSaveSomething() {
  const { isOpen, providerValue, modelValue, setProviderValue, setModelValue, setError } = useSomeModalStore()
  const { selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useSomeStore()

  const hasMountedRef = useRef(false)
  const isSavingRef = useRef(false)

  // 1. sync store → form, but arm autosave only when data is real
  useEffect(() => {
    if (!isOpen) {
      hasMountedRef.current = false
      return
    }

    if (!selectedProvider) return

    setProviderValue(selectedProvider)
    setModelValue(selectedModel)
    hasMountedRef.current = true
  }, [isOpen, selectedProvider, selectedModel])

  // 2. dirty check
  const isDirty = providerValue !== selectedProvider || modelValue !== selectedModel

  // 3. debounce only the form snapshot
  const debouncedSnapshot = useDebounce(JSON.stringify({ providerValue, modelValue }), 2000)

  // 4. save with fresh state, not stale closure
  const saveFn = useCallback(async (): Promise<boolean> => {
    const modal = useSomeModalStore.getState()
    const store = useSomeStore.getState()

    const freshProvider = modal.providerValue
    const freshModel = modal.modelValue

    const freshIsDirty = freshProvider !== store.selectedProvider || freshModel !== store.selectedModel
    if (!freshIsDirty || isSavingRef.current || !freshProvider) return false

    isSavingRef.current = true

    try {
      const result = await fetch("/api/something", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: freshProvider,
          model: freshModel,
        }),
      })

      if (!result.ok) throw Error("Save failed")

      setSelectedProvider(freshProvider)
      setSelectedModel(freshModel)
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      isSavingRef.current = false
    }
  }, [setError, setSelectedModel, setSelectedProvider])

  const saveFnRef = useRef(saveFn)

  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  // 5. autosave
  useEffect(() => {
    if (!isOpen || !hasMountedRef.current || !isDirty) return
    saveFnRef.current()
  }, [debouncedSnapshot, isOpen, isDirty])

  return {
    providerValue,
    modelValue,
    setProviderValue,
    setModelValue,
    isDirty,
  }
}
```
````
