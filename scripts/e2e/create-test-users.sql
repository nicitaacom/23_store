-- Run once in the existing Supabase project to install the run-owned cleanup journal.
-- Weekly Auth accounts are created through the real Supabase Admin API with unique run ids and run-derived passwords.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public."23_e2e_resource_registry" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_name text NOT NULL,
  run_id text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  owner_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cleanup_required', 'cleaned')),
  lease_expires_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "23_e2e_resource_registry_run_resource_unique"
    UNIQUE (suite_name, run_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS "23_e2e_resource_registry_active_lease_idx"
  ON public."23_e2e_resource_registry" (lease_expires_at)
  WHERE status IN ('active', 'cleanup_required');

ALTER TABLE public."23_e2e_resource_registry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."23_e2e_resource_registry" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."23_e2e_resource_registry" TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
