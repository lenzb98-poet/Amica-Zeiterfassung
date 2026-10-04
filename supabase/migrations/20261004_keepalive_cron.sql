-- Hält das Projekt aktiv: ruft alle 12 Stunden die eigene API ab, damit
-- Supabase es bei Inaktivität nicht pausiert.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('amica-keepalive')
where exists (select 1 from cron.job where jobname = 'amica-keepalive');

select cron.schedule(
  'amica-keepalive',
  '0 */12 * * *',
  $$
  select net.http_get(
    url := 'https://eafexkyezkymlckfrztk.supabase.co/rest/v1/clients?select=id&limit=1',
    headers := jsonb_build_object(
      'apikey', 'sb_publishable_35m9-QrHkksaotEWsS12RQ_cVjTb6RU'
    )
  );
  $$
);
