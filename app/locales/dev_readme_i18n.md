## i18n setup

package.json

```json
 "next-international": "^1.3.1",
```

###

1. copy paste middleware.ts
2. copy paste folders `locales` `types/i18n`
3. configuge `middleware.ts` e.g `urlMappingStrategy: "rewrite"` if you don't want "/en" in path
4. Create folder [locale] - paste every single route there
5. Create `LanguageDropdown`
6. `pnpm build` to make sure everything works
7. In supabase https://supabase.com/dashboard/project/zvpzoumubcidrtkgxwqx/auth/url-configuration
   Update URLS
   from: `https://23-store.vercel.app/auth/completed?code=**`
   to: `https://23-store.vercel.app/*/auth/callback/credentials`
   to: `https://23-store.vercel.app/*/auth/callback/oauth`
