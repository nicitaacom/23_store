-- Migration: role TEXT → roles TEXT[]
-- Allows a user to hold multiple roles simultaneously e.g. ["ADMIN","SUPPORT"]

ALTER TABLE public."23_users" ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{"USER"}';
UPDATE public."23_users" SET roles = ARRAY[role] WHERE role IS NOT NULL;

DROP POLICY IF EXISTS "SUPPORT/ADMIN all access" ON public."23_tickets";
DROP POLICY IF EXISTS "SUPPORT/ADMIN select" ON public."23_messages";

ALTER TABLE public."23_users" DROP COLUMN IF EXISTS role;

CREATE POLICY "SUPPORT/ADMIN all access" ON public."23_tickets" FOR ALL USING (
  EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['SUPPORT', 'ADMIN'])
);

CREATE POLICY "SUPPORT/ADMIN select" ON public."23_messages" FOR SELECT USING (
  EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['SUPPORT', 'ADMIN'])
);
