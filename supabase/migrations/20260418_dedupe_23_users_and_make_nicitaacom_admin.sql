UPDATE public."23_users"
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

DO $$
DECLARE
  canonical_row RECORD;
  duplicate_row RECORD;
  merged_providers TEXT[];
BEGIN
  FOR canonical_row IN
    SELECT DISTINCT ON (email)
      id,
      email,
      role,
      created_at,
      email_confirmed_at
    FROM public."23_users"
    ORDER BY
      email,
      CASE role
        WHEN 'ADMIN' THEN 2
        WHEN 'SUPPORT' THEN 1
        ELSE 0
      END DESC,
      (email_confirmed_at IS NOT NULL) DESC,
      created_at ASC
  LOOP
    FOR duplicate_row IN
      SELECT *
      FROM public."23_users"
      WHERE email = canonical_row.email
        AND id <> canonical_row.id
      ORDER BY created_at ASC
    LOOP
      UPDATE public."23_products"
      SET owner_id = canonical_row.id
      WHERE owner_id = duplicate_row.id;

      UPDATE public."23_tickets"
      SET owner_id = canonical_row.id
      WHERE owner_id = duplicate_row.id;

      UPDATE public."23_messages"
      SET sender_id = canonical_row.id
      WHERE sender_id = duplicate_row.id;

      INSERT INTO public."23_users_cart" (id, cart_products)
      VALUES (canonical_row.id, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING;

      UPDATE public."23_users_cart"
      SET cart_products = COALESCE(
        (SELECT cart_products FROM public."23_users_cart" WHERE id = duplicate_row.id),
        '{}'::jsonb
      ) || COALESCE(cart_products, '{}'::jsonb)
      WHERE id = canonical_row.id;

      DELETE FROM public."23_users_cart"
      WHERE id = duplicate_row.id;

      SELECT ARRAY(
        SELECT DISTINCT provider
        FROM unnest(COALESCE(canonical_row.providers, ARRAY[]::text[]) || COALESCE(duplicate_row.providers, ARRAY[]::text[])) AS provider
        WHERE provider IS NOT NULL AND btrim(provider) <> ''
        ORDER BY provider
      ) INTO merged_providers;

      UPDATE public."23_users" AS target
      SET
        username = COALESCE(NULLIF(btrim(target.username), ''), NULLIF(btrim(duplicate_row.username), ''), split_part(target.email, '@', 1)),
        avatar_url = COALESCE(NULLIF(btrim(target.avatar_url), ''), NULLIF(btrim(duplicate_row.avatar_url), '')),
        email_confirmed_at = COALESCE(target.email_confirmed_at, duplicate_row.email_confirmed_at),
        providers = CASE WHEN cardinality(merged_providers) = 0 THEN NULL ELSE merged_providers END,
        role = CASE
          WHEN (
            CASE target.role
              WHEN 'ADMIN' THEN 2
              WHEN 'SUPPORT' THEN 1
              ELSE 0
            END
          ) >= (
            CASE duplicate_row.role
              WHEN 'ADMIN' THEN 2
              WHEN 'SUPPORT' THEN 1
              ELSE 0
            END
          ) THEN target.role
          ELSE duplicate_row.role
        END
      WHERE target.id = canonical_row.id;

      DELETE FROM public."23_users"
      WHERE id = duplicate_row.id;
    END LOOP;
  END LOOP;
END $$;

UPDATE public."23_users"
SET role = 'ADMIN'
WHERE email = 'nicitaacom@gmail.com';

CREATE UNIQUE INDEX IF NOT EXISTS "23_users_email_unique_idx"
ON public."23_users" (email);
