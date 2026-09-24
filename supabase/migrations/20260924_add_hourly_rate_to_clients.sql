-- Stundensatz je Klient in Euro, optional
alter table public.clients
  add column if not exists hourly_rate numeric(8,2)
  check (hourly_rate is null or hourly_rate >= 0);
