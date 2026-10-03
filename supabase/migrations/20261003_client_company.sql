-- Firma je Klient, erscheint auf der Rechnung über dem Namen.
alter table public.clients
  add column if not exists company text;

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
      'company', v_client.company,
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
