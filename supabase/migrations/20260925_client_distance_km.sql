-- Einfache Strecke von zu Hause zum Klienten, für die Fahrtkosten in der Steuer
alter table public.clients
  add column if not exists distance_km numeric(6,1) check (distance_km is null or distance_km >= 0);
