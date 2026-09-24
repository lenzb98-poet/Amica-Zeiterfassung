-- Anschrift, Anrede und feste Leistungsart je Klient
alter table public.clients
  add column if not exists salutation text check (salutation in ('Frau', 'Herr')),
  add column if not exists street text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists service_type text not null default 'Hilfe im Haushalt';

-- Rechnungen: Empfänger und Positionen werden beim Erstellen als fester
-- Stand gespeichert, damit spätere Änderungen am Klienten oder Stundensatz
-- eine verschickte Rechnung nicht verändern.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number_seq integer not null unique,
  number text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  invoice_date date not null default current_date,
  period_start date not null,
  period_end date not null,
  recipient jsonb not null,
  items jsonb not null,
  total numeric(10,2) not null,
  status text not null default 'offen' check (status in ('offen', 'bezahlt')),
  paid_at date,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "Angemeldete duerfen Rechnungen lesen"
  on public.invoices for select to authenticated using (true);
create policy "Angemeldete duerfen Rechnungen anlegen"
  on public.invoices for insert to authenticated with check (true);
create policy "Angemeldete duerfen Rechnungen aendern"
  on public.invoices for update to authenticated using (true) with check (true);

alter table public.time_entries
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists time_entries_invoice_idx on public.time_entries (invoice_id);
create index if not exists invoices_client_idx on public.invoices (client_id);

-- Abgerechnete Zeiten dürfen nicht mehr geändert oder gelöscht werden.
drop policy if exists "Angemeldete duerfen Zeiten aendern" on public.time_entries;
drop policy if exists "Angemeldete duerfen Zeiten loeschen" on public.time_entries;
create policy "Angemeldete duerfen offene Zeiten aendern"
  on public.time_entries for update to authenticated
  using (invoice_id is null) with check (true);
create policy "Angemeldete duerfen offene Zeiten loeschen"
  on public.time_entries for delete to authenticated
  using (invoice_id is null);

-- Erstellt atomar die Rechnung eines Klienten für einen Zeitraum aus allen
-- noch nicht abgerechneten Zeiten und vergibt die nächste Nummer.
create or replace function public.create_invoice(
  p_client_id uuid,
  p_period_start date,
  p_period_end date
) returns public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_client public.clients;
  v_seq integer;
  v_items jsonb;
  v_total numeric(10,2);
  v_invoice public.invoices;
begin
  -- Sperrt die Nummernvergabe, damit zwei gleichzeitige Rechnungen
  -- nicht dieselbe Nummer bekommen.
  perform pg_advisory_xact_lock(hashtext('invoice_number'));

  select * into v_client from public.clients where id = p_client_id;
  if not found then
    raise exception 'Klient nicht gefunden';
  end if;
  if v_client.hourly_rate is null then
    raise exception 'Für diesen Klienten ist kein Stundensatz hinterlegt';
  end if;

  select
    jsonb_agg(jsonb_build_object(
      'service', v_client.service_type,
      'date', t.entry_date,
      'minutes', t.minutes,
      'rate', v_client.hourly_rate,
      'amount', round(t.minutes / 60.0 * v_client.hourly_rate, 2)
    ) order by t.entry_date, t.start_time),
    sum(round(t.minutes / 60.0 * v_client.hourly_rate, 2))
  into v_items, v_total
  from public.time_entries t
  where t.client_id = p_client_id
    and t.invoice_id is null
    and t.entry_date between p_period_start and p_period_end;

  if v_items is null then
    raise exception 'Keine offenen Zeiten in diesem Zeitraum';
  end if;

  -- Die bisher letzte Rechnung außerhalb der App war R-0028.
  select coalesce(max(number_seq), 28) + 1 into v_seq from public.invoices;

  insert into public.invoices (
    number_seq, number, client_id, period_start, period_end, recipient, items, total
  ) values (
    v_seq,
    'R-' || lpad(v_seq::text, 4, '0'),
    p_client_id,
    p_period_start,
    p_period_end,
    jsonb_build_object(
      'salutation', v_client.salutation,
      'name', v_client.name,
      'street', v_client.street,
      'postal_code', v_client.postal_code,
      'city', v_client.city
    ),
    v_items,
    v_total
  )
  returning * into v_invoice;

  update public.time_entries
  set invoice_id = v_invoice.id
  where client_id = p_client_id
    and invoice_id is null
    and entry_date between p_period_start and p_period_end;

  return v_invoice;
end;
$$;

revoke execute on function public.create_invoice(uuid, date, date) from public, anon;
grant execute on function public.create_invoice(uuid, date, date) to authenticated;
