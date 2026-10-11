-- Apply after the routes are deployed. Reuse the existing keys-check Vault settings.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'keys_webhook_base_url') OR
     NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'keys_webhook_secret') THEN
    RAISE EXCEPTION 'Set keys_webhook_base_url and keys_webhook_secret (the deployment CRON_SECRET) in Vault before scheduling storage cleanup';
  END IF;
END;
$$;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN (
  'cleanup_guest_support_images', '23_storage_cleanup_resume', '23_storage_staging_cleanup'
);
SELECT cron.schedule('cleanup_guest_support_images', '0 3 * * 0', $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_base_url') || '/api/storage/cleanup',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_secret'), 'Content-Type', 'application/json'),
    body := '{"mode":"guests","start":true}'::jsonb, timeout_milliseconds := 60000
  );
$$);
SELECT cron.schedule('23_storage_staging_cleanup', '15 3 * * *', $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_base_url') || '/api/storage/cleanup',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_secret'), 'Content-Type', 'application/json'),
    body := '{"mode":"staging","start":true}'::jsonb, timeout_milliseconds := 60000
  );
$$);
SELECT cron.schedule('23_storage_cleanup_resume', '7,17,27,37,47,57 * * * *', $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_base_url') || '/api/storage/cleanup',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_secret'), 'Content-Type', 'application/json'),
    body := '{"mode":"both","start":false}'::jsonb, timeout_milliseconds := 60000
  );
$$);
