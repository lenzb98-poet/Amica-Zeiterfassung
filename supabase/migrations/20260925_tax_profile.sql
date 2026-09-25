-- Persönliche Angaben für die Steuerschätzung (eine einzige Zeile)
create table if not exists public.tax_profile (
  id boolean primary key default true check (id),
  married boolean not null default false,
  church_rate numeric(3,1) not null default 0 check (church_rate in (0, 8, 9)),
  other_income numeric(10,2) not null default 0 check (other_income >= 0),
  partner_income numeric(10,2) not null default 0 check (partner_income >= 0),
  deductions numeric(10,2) not null default 0 check (deductions >= 0),
  other_expenses numeric(10,2) not null default 0 check (other_expenses >= 0),
  updated_at timestamptz not null default now()
);

insert into public.tax_profile (id) values (true) on conflict (id) do nothing;

alter table public.tax_profile enable row level security;

create policy "Angemeldete duerfen Steuerdaten lesen"
  on public.tax_profile for select to authenticated using (true);
create policy "Angemeldete duerfen Steuerdaten aendern"
  on public.tax_profile for update to authenticated using (true) with check (true);
