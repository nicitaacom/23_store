import { useCallback, useEffect, useState } from "react"
import { useCategoryPreferencesStore } from "@/store/categories/useCategoryPreferencesStore"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"

export const useCategoryPreferences = (isAuthenticated: boolean) => {
  const [isSkeleton, setIsSkeleton] = useState(isAuthenticated)
  const { hydrateFromDB, recordView: storeRecordView } = useCategoryPreferencesStore()

  useEffect(() => {
    if (!isAuthenticated) {
      setIsSkeleton(false)
      return
    }

    categoryViewsSDK
      .selectDBCategoryViews()
      .then(result => {
        if ("views" in result) hydrateFromDB(result.views)
      })
      .finally(() => setIsSkeleton(false))
  }, [isAuthenticated, hydrateFromDB])

  const recordView = useCallback(
    (categoryId: string) => {
      storeRecordView(categoryId)
      if (isAuthenticated) {
        categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId }).catch(() => {})
      }
    },
    [isAuthenticated, storeRecordView],
  )

  return { isSkeleton, recordView }
}
