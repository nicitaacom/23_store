-- Apply through the Supabase SQL editor before deploying the storage routes.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('23_upload-staging', '23_upload-staging', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

-- Existing permissive policies stay documented; these restrictions prevent bypassing the API.
DO $$
DECLARE policy_name text; operation text;
  application_buckets text := '(''23_product-images'',''23_ai-product-images'',''23_avatar-images'',''23_support-images'',''23_support-guest-images'',''23_product-personalization-images'',''23_upload-staging'')';
BEGIN
  FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    policy_name := '23_controlled_storage_' || lower(operation);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    IF operation = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (bucket_id NOT IN %s)', policy_name, application_buckets);
    ELSIF operation = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (bucket_id NOT IN %s) WITH CHECK (bucket_id NOT IN %s)', policy_name, application_buckets, application_buckets);
    ELSE
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (bucket_id NOT IN %s)', policy_name, application_buckets);
    END IF;
  END LOOP;
END;
$$;
DROP POLICY IF EXISTS "23_private_staging_reads" ON storage.objects;
CREATE POLICY "23_private_staging_reads" ON storage.objects AS RESTRICTIVE
FOR SELECT TO anon, authenticated USING (bucket_id <> '23_upload-staging');

CREATE OR REPLACE FUNCTION public."23_storage_usage"()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT jsonb_build_object(
    'databaseBytes', pg_database_size(current_database()),
    'applicationStorageBytes', (
      SELECT CASE WHEN bool_or(COALESCE(metadata->>'size', '') !~ '^[0-9]+$') THEN NULL
        ELSE COALESCE(SUM(CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::numeric ELSE 0 END), 0) END
      FROM storage.objects WHERE bucket_id = ANY(ARRAY[
        '23_product-images','23_ai-product-images','23_avatar-images','23_support-images',
        '23_support-guest-images','23_product-personalization-images'
      ])
    )
  );
$$;
REVOKE ALL ON FUNCTION public."23_storage_usage"() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public."23_storage_usage"() TO service_role;

CREATE OR REPLACE FUNCTION public."23_storage_update_references"(
  table_name text, row_key jsonb, before_values jsonb, after_values jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  allowed_columns text[];
  required_keys text[];
  schema_name text := 'public';
  relation_name text := table_name;
  column_name text;
  assignments text := '';
  comparisons text := '';
  affected integer;
BEGIN
  CASE table_name
    WHEN '23_users' THEN allowed_columns := ARRAY['avatar_url']; required_keys := ARRAY['id'];
    WHEN '23_products' THEN allowed_columns := ARRAY['img_url','variants','personalization']; required_keys := ARRAY['price_id','owner_id','id'];
    WHEN '23_ai_price_proposals' THEN allowed_columns := ARRAY['proposed_variants']; required_keys := ARRAY['id'];
    WHEN '23_personalized_designs' THEN allowed_columns := ARRAY['source_url']; required_keys := ARRAY['id'];
    WHEN '23_tickets' THEN allowed_columns := ARRAY['owner_avatar_url']; required_keys := ARRAY['id'];
    WHEN '23_messages' THEN allowed_columns := ARRAY['images','sender_avatar_url']; required_keys := ARRAY['id'];
    WHEN 'auth.users' THEN
      schema_name := 'auth'; relation_name := 'users';
      allowed_columns := ARRAY['raw_user_meta_data']; required_keys := ARRAY['id'];
    ELSE RAISE EXCEPTION 'Unsupported storage reference table';
  END CASE;
  IF jsonb_typeof(row_key) <> 'object' OR jsonb_typeof(before_values) <> 'object' OR jsonb_typeof(after_values) <> 'object'
    OR NOT (row_key ?& required_keys) OR row_key = '{}'::jsonb OR after_values = '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid storage reference comparison';
  END IF;
  FOR column_name IN SELECT jsonb_object_keys(row_key) LOOP
    IF NOT (column_name = ANY(required_keys)) OR row_key->column_name = 'null'::jsonb THEN
      RAISE EXCEPTION 'Invalid row key';
    END IF;
  END LOOP;
  FOR column_name IN SELECT jsonb_object_keys(before_values) LOOP
    IF NOT (column_name = ANY(allowed_columns)) THEN RAISE EXCEPTION 'Unsupported comparison column'; END IF;
    comparisons := comparisons || format(' AND to_jsonb(reference_row)->%L = $3->%L', column_name, column_name);
  END LOOP;
  FOR column_name IN SELECT jsonb_object_keys(after_values) LOOP
    IF NOT (column_name = ANY(allowed_columns)) OR NOT (before_values ? column_name) THEN
      RAISE EXCEPTION 'Unsupported storage reference column';
    END IF;
    assignments := assignments || CASE WHEN assignments = '' THEN '' ELSE ', ' END ||
      format('%I = (jsonb_populate_record(NULL::%I.%I, $1)).%I', column_name, schema_name, relation_name, column_name);
  END LOOP;
  EXECUTE format('UPDATE %I.%I AS reference_row SET %s WHERE to_jsonb(reference_row) @> $2%s',
    schema_name, relation_name, assignments, comparisons) USING after_values, row_key, before_values;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 1 THEN RAISE EXCEPTION 'Storage reference row key is not unique'; END IF;
  RETURN affected = 1;
END;
$$;
REVOKE ALL ON FUNCTION public."23_storage_update_references"(text,jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public."23_storage_update_references"(text,jsonb,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public."23_storage_guest_file_referenced"(candidate_urls text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."23_messages" AS message, unnest(message.images) AS image
    WHERE split_part(image, '?', 1) = ANY(candidate_urls)
  );
$$;
REVOKE ALL ON FUNCTION public."23_storage_guest_file_referenced"(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public."23_storage_guest_file_referenced"(text[]) TO service_role;
