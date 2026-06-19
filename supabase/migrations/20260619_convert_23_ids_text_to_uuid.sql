-- Convert 23_users.id, 23_users_cart.id, 23_products.owner_id from TEXT to UUID (authed users only); tickets.owner_id + messages.sender_id stay TEXT (anonymous).

BEGIN;

-- Drop ONLY policies that reference the altered columns or query 23_users (these block the ALTER); column-independent policies (e.g. insert WITH CHECK true) are left untouched. Recreated below.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('23_users', '23_users_cart', '23_products', '23_tickets', '23_messages')
      AND (
        coalesce(qual, '') ~* '(auth\.uid|owner_id|sender_id|23_users|\bid\b)'
        OR coalesce(with_check, '') ~* '(auth\.uid|owner_id|sender_id|23_users|\bid\b)'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Drop FKs to auth.users on the text columns (recreated after the type change).
ALTER TABLE public."23_users"      DROP CONSTRAINT IF EXISTS "23_users_id_fkey";
ALTER TABLE public."23_users_cart" DROP CONSTRAINT IF EXISTS "23_users_cart_id_fkey";
ALTER TABLE public."23_products"   DROP CONSTRAINT IF EXISTS "23_products_owner_id_fkey";

-- Sanity check: abort if any value is not a valid uuid (would make the cast fail).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."23_users"      WHERE id       !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  OR EXISTS (SELECT 1 FROM public."23_users_cart" WHERE id       !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  OR EXISTS (SELECT 1 FROM public."23_products"   WHERE owner_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'Non-uuid value present in a column being converted to uuid — clean data first.';
  END IF;
END $$;

-- Convert the columns text -> uuid.
ALTER TABLE public."23_users"      ALTER COLUMN id       TYPE uuid USING id::uuid;
ALTER TABLE public."23_users_cart" ALTER COLUMN id       TYPE uuid USING id::uuid;
ALTER TABLE public."23_products"   ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;

-- Clean up orphan rows whose auth.users user was deleted (these block the FK). Going forward ON DELETE CASCADE prevents new orphans.
DELETE FROM public."23_users_cart" c WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = c.id);
DELETE FROM public."23_products"   p WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = p.owner_id);
DELETE FROM public."23_users"      u WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id);

-- Recreate FKs to auth.users now that the columns are uuid (ON DELETE CASCADE = no future orphans). Idempotent: add only if missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '23_users_id_fkey' AND conrelid = 'public."23_users"'::regclass) THEN
    ALTER TABLE public."23_users" ADD CONSTRAINT "23_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '23_users_cart_id_fkey' AND conrelid = 'public."23_users_cart"'::regclass) THEN
    ALTER TABLE public."23_users_cart" ADD CONSTRAINT "23_users_cart_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '23_products_owner_id_fkey' AND conrelid = 'public."23_products"'::regclass) THEN
    ALTER TABLE public."23_products" ADD CONSTRAINT "23_products_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Recreate the blocking policies with plain uuid comparison (no ::text cast), using their EXACT live names.
-- Idempotent: each is created only if it does not already exist (safe to re-run).
-- Column-independent policies are NOT touched: 23_messages "Allow insert for everyone", 23_products "All users select" + "Auth insert".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_users' AND policyname='Allow users to select their own row') THEN
    CREATE POLICY "Allow users to select their own row" ON public."23_users" FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_users_cart' AND policyname='Allow users to select their own cart') THEN
    CREATE POLICY "Allow users to select their own cart" ON public."23_users_cart" FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_users_cart' AND policyname='Allow users to update their own cart') THEN
    CREATE POLICY "Allow users to update their own cart" ON public."23_users_cart" FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='Owner delete') THEN
    CREATE POLICY "Owner delete" ON public."23_products" FOR DELETE USING (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='Owner update') THEN
    CREATE POLICY "Owner update" ON public."23_products" FOR UPDATE USING (owner_id = auth.uid());
  END IF;

  -- tickets/messages policies (dropped above because their subquery references 23_users.id). owner_id/sender_id stay TEXT.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_tickets' AND policyname='SUPPORT/ADMIN all access') THEN
    CREATE POLICY "SUPPORT/ADMIN all access" ON public."23_tickets" FOR ALL USING (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND role IN ('SUPPORT', 'ADMIN'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_messages' AND policyname='SUPPORT/ADMIN select') THEN
    CREATE POLICY "SUPPORT/ADMIN select" ON public."23_messages" FOR SELECT USING (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND role IN ('SUPPORT', 'ADMIN'))
    );
  END IF;
END $$;

COMMIT;
