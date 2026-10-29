-- Schedules the amc-expiry-check edge function to run daily so AMC reminder
-- emails go out on their own, independent of anyone opening the app.
--
-- MANUAL STEPS REQUIRED before this migration will actually fire anything:
-- this file intentionally does NOT contain a real secret (committing one to a
-- migration would leak it in git history).
--
-- 1. Generate a random secret and set it on the functions:
--      supabase secrets set CRON_SECRET=<random-secret>
-- 2. Store the same value in Supabase Vault once, from the SQL editor on the
--    hosted project (NOT from a file that gets committed):
--      select vault.create_secret('<random-secret>', 'amc_cron_secret');
-- 3. Replace <project-ref> and <anon-key> below (the anon key is the public one
--    the app uses; it only gets the call past the Functions gateway), then run
--    the cron.schedule block from the SQL editor.
--
-- The function only runs for a matching x-cron-secret header (or the
-- service-role key); see supabase/functions/_shared/guard.ts.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'amc-expiry-check-daily',
  '0 8 * * *', -- daily at 08:00 UTC; adjust to the team's timezone as needed
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/amc-expiry-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <anon-key>',
      'x-cron-secret', (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'amc_cron_secret'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
