import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { Stats } from "./components/Stats"

export default async function StatsPage() {
  const { data: stats } = await supabaseAdmin.from("utm_stats").select("*").order("clicks", { ascending: false })

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-title mb-2">Campaign Performance</h1>
          <p className="text-subTitle">Track your marketing campaign effectiveness</p>
        </div>

        <Stats stats={stats} />
      </div>
    </div>
  )
}
