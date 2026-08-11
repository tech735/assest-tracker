-- Schedules the amc-expiry-check edge function to run daily so AMC reminder
-- emails go out on their own, independent of anyone opening the app.
--
-- MANUAL STEP REQUIRED before this migration will actually fire anything:
-- this file intentionally does NOT contain a real API key (committing a secret
-- to a migration would leak it in git history). After this migration runs,
-- store the project's service role key in Supabase Vault once, from the SQL
-- editor on the hosted project (NOT from a file that gets committed):
--
--   select vault.create_secret('<your-service-role-key>', 'amc_cron_service_role_key');
--
-- Then replace <project-ref> below with this project's actual ref before
-- deploying this migration (`supabase db push`), or run the corrected
-- `cron.schedule` block manually from the SQL editor.
--
-- Simpler alternative: skip pg_cron entirely and use Supabase's built-in Cron
-- Jobs UI for Edge Functions (Dashboard -> Edge Functions -> amc-expiry-check
-- -> Cron) to schedule this function on a "0 8 * * *" (daily 08:00 UTC)
-- expression — no SQL or Vault setup needed. If you use that route, this
-- migration is optional and can be skipped/reverted.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'amc-expiry-check-daily',
  '0 8 * * *', -- daily at 08:00 UTC; adjust to the team's timezone as needed
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/amc-expiry-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'amc_cron_service_role_key'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
