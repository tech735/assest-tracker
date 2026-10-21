-- Resolves Security Advisor 0014 extension_in_public for pg_net.
--
-- 0005 ran CREATE EXTENSION pg_net without a schema, so it was registered in public. pg_net is not
-- relocatable (ALTER EXTENSION ... SET SCHEMA is unsupported), so it has to be dropped and
-- recreated. Its functions always live in the `net` schema either way, so the
-- amc-expiry-check-daily cron job (which calls net.http_post by name) keeps working unchanged.
--
-- Side effects: any HTTP requests still queued by pg_net at the moment this runs are discarded,
-- and the net._http_response history table is emptied. Run it outside the 08:00 UTC cron window.
-- If DROP fails with a dependency error, something else (e.g. a view) uses pg_net objects - do
-- not add CASCADE without checking what it would drop.

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
