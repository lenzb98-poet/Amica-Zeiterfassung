create policy "Angemeldete duerfen Rechnungen loeschen"
  on public.invoices for delete to authenticated using (true);

-- Löscht eine Rechnung. Ihre Zeiten werden über den Fremdschlüssel wieder
-- offen. War es die zuletzt vergebene Nummer und wurde der Nummernkreis
-- seitdem nicht verstellt, wird die Nummer wieder frei.
create or replace function public.delete_invoice(p_invoice_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_seq integer;
begin
  perform pg_advisory_xact_lock(hashtext('invoice_number'));

  select number_seq into v_seq from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Rechnung nicht gefunden';
  end if;

  delete from public.invoices where id = p_invoice_id;

  if v_seq > coalesce((select max(number_seq) from public.invoices), 0) then
    update public.invoice_settings
    set next_number = v_seq
    where id and next_number = v_seq + 1;
  end if;
end;
$$;

revoke execute on function public.delete_invoice(uuid) from public, anon;
grant execute on function public.delete_invoice(uuid) to authenticated;
