import { useCallback, useEffect, useState } from "react"

import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useCategoryPreferences as useCategoryPreferencesStore } from "@/store/categories/useCategoryPreferences"

export const useCategoryPreferences = (isAuthenticated: boolean) => {
  const [isSkeleton, setIsSkeleton] = useState(isAuthenticated)
  const [prevIsAuthenticated, setPrevIsAuthenticated] = useState(isAuthenticated)
  const { hydrateFromDB, recordView: storeRecordView } = useCategoryPreferencesStore()

  if (isAuthenticated !== prevIsAuthenticated) {
    setPrevIsAuthenticated(isAuthenticated)
    if (!isAuthenticated) setIsSkeleton(false)
  }

  useEffect(() => {
    if (!isAuthenticated) return

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
