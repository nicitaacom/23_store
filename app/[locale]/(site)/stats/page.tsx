import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { Stats } from "./components/Stats"
import { getI18n } from "@/locales/server"

export default async function StatsPage() {
  const { data: stats } = await supabaseAdmin.from("utm_stats").select("*").order("clicks", { ascending: false })
  const t = await getI18n()

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-title mb-2">{t("stats.campaign_title")}</h1>
          <p className="text-subTitle">{t("stats.campaign_subtitle")}</p>
        </div>

        <Stats stats={stats} />
      </div>
    </div>
  )
}
