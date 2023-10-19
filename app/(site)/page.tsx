import supabaseServer from "@/utils/supabaseServer"
import { Products } from "./components"

export default async function Home() {
  //TODO - fix error with supabase cookies (I need supabaseServer to getUser() from cookies)
  const { data: user } = await supabaseServer().auth.getUser()

  return (
    <div className="text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12">
      <section className="flex flex-col gap-y-4">
        <Products user={user.user ? user.user : null} />
      </section>
    </div>
  )
}
