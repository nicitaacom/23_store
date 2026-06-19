-- 🗄️ DB backup function (ADMIN-only feature)
-- Returns a JSON snapshot of every 23_-prefixed table (one key per table).
-- Called from /api/backup/export via supabaseAdmin.rpc('backup_23_tables').
-- SECURITY DEFINER so it can read past RLS; the API route already enforces ADMIN before calling.
-- NOTE: the shared utm_stats table is intentionally excluded (shared across projects 14/23/28/29).

CREATE OR REPLACE FUNCTION public.backup_23_tables()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    '23_users',      (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_users" t),
    '23_users_cart', (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_users_cart" t),
    '23_products',   (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_products" t),
    '23_tickets',    (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_tickets" t),
    '23_messages',   (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_messages" t)
  );
$$;

-- Only the service role (used by supabaseAdmin) may execute it.
REVOKE ALL ON FUNCTION public.backup_23_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backup_23_tables() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_23_tables() TO service_role;
