import { useState, useEffect } from "react"

/**
 * Custom hook that debounces a value after a specified delay.
 * @param value - The value to debounce.
 * @param delayMs - The debounce delay in milliseconds.
 * @returns The debounced value.
 * Managed by chatGPT
 * ## Usage example
 * ```ts
 *   const debouncedSearch = useDebounce(searchInputValue, 300)

 *  useEffect(() => {
     if (activeTab !== "search") return
 
     const searchEmails = async () => {
       // 1. Early return if no search
 
       if (!debouncedSearch) return setEmailsForKey("search", [])
 
       setIsSkeleton(true)
       try {
         // 2. Initialize SDK and search
         const emailsSDK = new EmailsSDK()
         const results = await emailsSDK.selectDBBySearch(encryptedEnvsClient, debouncedSearch, domain)
         // 3. Handle error result
         if (typeof results === "string") throw Error(results)
         setEmailsForKey("search", results)
       } catch (error) {
         console.error("Search failed:", error)
         if (error instanceof Error) toast.show("error", "Error fetching serach results", error.message)
       } finally {
         setIsSkeleton(false)
       }
     }
     searchEmails()
   }, [debouncedSearch, activeTab])
 ```
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Set a timer to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    // Cleanup function to clear the timer if the value changes before the delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debouncedValue
}
