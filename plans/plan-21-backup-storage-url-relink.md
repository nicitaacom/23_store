# plan-21 — Relink Storage URLs after cross-project backup restore

**Priority:** P1
**Recommended model:** GPT-5 · high thinking
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** plan-11

## Why

Files import already preserves every Storage object's bucket and path, but restored table rows keep
the old Supabase project hostname inside their public image URLs. The files therefore exist in the
new project while products, variants, personalization, avatars and support images still request the
old project and show 404 responses.

The current archive contains 1,092 files. Of 1,071 Storage URL references in the current database,
861 references match the archive and 210 references (170 unique paths) do not. Matching references
must point at `NEXT_PUBLIC_SUPABASE_URL`; unmatched references stay unchanged and are reported.

## Steps

1. Add a pure, tested Storage URL mapper and declare every URL-bearing backup column.
2. Add an ADMIN-only relink route that matches current Storage paths, updates table rows and Auth
   avatar metadata, and returns updated/unresolved counts.
3. Run relinking after both Tables and Files import so either import order works; show the summary
   and unresolved warning in the backup UI, then refresh the route.
4. Update `dev_readme-backup.md`; no SQL or environment changes are required because the buckets,
   policies and URL-bearing columns already exist in `dev_readme-supbase-sql.md`.
5. Run backup unit tests, type-check, lint and a live import verification against the current
   archive. The expected current result is 861 relinked references and 210 unchanged unresolved
   references.

## Decisions

- Match by exact `bucket/path`, independent of the old Supabase hostname.
- Rewrite only public URLs in `23_public-images` or `23_avatar-images` when that path exists in the
  target Storage. External, current-project, invalid and missing-path URLs stay unchanged.
- Import only the currently available Storage archive; do not add multi-archive selection.
- Unresolved references are a warning, not an import failure.
- Relinking is idempotent and retry-safe.
