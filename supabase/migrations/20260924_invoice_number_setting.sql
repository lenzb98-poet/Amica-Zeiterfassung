-- Einstellbare nächste Rechnungsnummer (eine einzige Zeile)
create table if not exists public.invoice_settings (
  id boolean primary key default true check (id),
  next_number integer not null check (next_number > 0)
);

insert into public.invoice_settings (id, next_number)
select true, coalesce((select max(number_seq) from public.invoices), 28) + 1
on conflict (id) do nothing;

alter table public.invoice_settings enable row level security;

create policy "Angemeldete duerfen Nummernkreis lesen"
  on public.invoice_settings for select to authenticated using (true);
create policy "Angemeldete duerfen Nummernkreis aendern"
  on public.invoice_settings for update to authenticated using (true) with check (true);

-- Die nächste Nummer darf nie auf eine schon vergebene zurückgesetzt werden.
create or replace function public.check_next_invoice_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.next_number <= coalesce((select max(number_seq) from public.invoices), 0) then
    raise exception 'Die Nummer ist bereits vergeben';
  end if;
  return new;
end;
$$;

drop trigger if exists check_next_invoice_number on public.invoice_settings;
create trigger check_next_invoice_number
  before update on public.invoice_settings
  for each row execute function public.check_next_invoice_number();

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

  select next_number into v_seq from public.invoice_settings where id for update;
  select greatest(v_seq, coalesce(max(number_seq), 0) + 1) into v_seq from public.invoices;
  update public.invoice_settings set next_number = v_seq + 1 where id;

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
