-- Vor- und Nachname getrennt erfassbar; "name" bleibt der komplette Anzeigename.
alter table public.clients
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Bestehende Klienten: letztes Wort als Nachname, Rest als Vorname.
update public.clients
set
  last_name = coalesce(last_name, split_part(trim(name), ' ', array_length(regexp_split_to_array(trim(name), '\s+'), 1))),
  first_name = coalesce(first_name, case
    when array_length(regexp_split_to_array(trim(name), '\s+'), 1) > 1
      then regexp_replace(trim(name), '\s+\S+$', '')
    else ''
  end)
where last_name is null or first_name is null;
