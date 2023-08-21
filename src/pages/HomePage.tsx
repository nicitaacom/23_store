import { useEffect } from "react"
import { Products } from "../components/Products"
import supabase from "../utils/supabaseClient"

export function HomePage() {
  return (
    <div className="text-2xl text-white min-h-screen flex flex-col gap-y-8 justify-between items-center py-12">
      <div className="flex flex-col gap-y-4">
        <Products />
      </div>
    </div>
  )
}
