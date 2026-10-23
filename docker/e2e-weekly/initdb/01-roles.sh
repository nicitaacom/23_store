#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path TO public, extensions;
CREATE TABLE IF NOT EXISTS public."23_products" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."23_products" TO service_role;
GRANT SELECT ON public."23_products" TO anon, authenticated;
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN SUPERUSER PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role, authenticator;
ALTER DATABASE postgres SET search_path TO public, extensions;
SQL
