create extension if not exists pgcrypto;

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  vendor text,
  invoice_number text,
  amount numeric(12, 2) not null default 0,
  issue_date date not null,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid', 'overdue')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.finance_invoices
add column if not exists invoice_number text;

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  beneficiary text,
  payment_method text,
  amount numeric(12, 2) not null default 0,
  expense_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_incomes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  placement text,
  amount numeric(12, 2) not null default 0,
  income_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.finance_trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  trip_date date not null,
  costs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists finance_invoices_created_at_idx on public.finance_invoices (created_at desc);
create index if not exists finance_expenses_created_at_idx on public.finance_expenses (created_at desc);
create index if not exists finance_incomes_created_at_idx on public.finance_incomes (created_at desc);
create index if not exists finance_trips_created_at_idx on public.finance_trips (created_at desc);
