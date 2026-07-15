-- ─── Papriwale.com — Supabase Schema ─────────────────────────────────────────
-- Run this entire script in Supabase SQL Editor once.

-- 1. Products
create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  current_stock_qty integer default 0,
  unit_purchase_cost decimal(10,2),
  safety_low_threshold integer default 5,
  price decimal(10,2),
  image text,
  sku text
);

-- 2. Product Variants
create table if not exists product_variants (
  variant_id text primary key,
  product_id text references products(id) on delete cascade,
  size_label text,
  variant_price_modifier decimal(10,2)
);

-- 3. Dealers
create table if not exists dealers (
  id text primary key,
  name text not null,
  address text,
  gstin varchar(15) unique,
  phone text
);

-- 4. Expenses
create table if not exists expenses (
  id text primary key,
  expense_code text check (expense_code in ('EXP_RAW_MATERIAL','EXP_SALARY_DRAW','EXP_MISC_OPERATIONAL')),
  amount decimal(10,2) not null,
  expense_date timestamptz default now(),
  dealer_id text references dealers(id) on delete set null,
  description text
);

-- 5. Employees
create table if not exists employees (
  id text primary key,
  name text,
  full_name text,
  designation_tag text not null,
  phone_number varchar(10),
  salary_type_flag text check (salary_type_flag in ('Monthly','Daily')),
  base_compensation_rate decimal(10,2),
  joining_date date not null,
  last_working_date date
);

-- 6. Attendance
create table if not exists attendance (
  id text primary key,
  employee_id text references employees(id) on delete cascade,
  calendar_date date not null,
  status_flag text check (status_flag in ('Present','Absent','Half-Day','Paid Leave')),
  unique(employee_id, calendar_date)
);

-- 7. Orders
create table if not exists orders (
  id text primary key,
  order_timestamp timestamptz default now(),
  timestamp timestamptz default now(),
  order_source text check (order_source in ('Direct POS','QR Table Menu')),
  table_id text,
  order_status text check (order_status in ('Pending','In-Preparation','Ready to Serve','Paid')),
  discount_applied decimal(10,2) default 0,
  tax_collected decimal(10,2) default 0,
  extraneous_charges decimal(10,2) default 0,
  grand_total decimal(10,2) not null,
  items jsonb,
  payment_method text,
  customer_phone text
);

-- 8. Inventory Log
create table if not exists inventory_log (
  id text primary key,
  type text,
  product_id text,
  product_name text,
  qty integer,
  reason text,
  operator text,
  timestamp timestamptz default now()
);

-- 9. Categories
create table if not exists categories (
  id text primary key,
  name text not null,
  image text
);

-- 10. Settings (single row store)
create table if not exists settings (
  id integer primary key default 1,
  value jsonb
);

-- ─── Seed Data ────────────────────────────────────────────────────────────────

insert into products (id, name, category, current_stock_qty, unit_purchase_cost, safety_low_threshold, price, image, sku) values
  ('p1','Kaju Katli','Sweets',25,400,5,520,'https://images.unsplash.com/photo-1626804475297-4160ebba5270?auto=format&fit=crop&q=80&w=200','SW-001'),
  ('p2','Motichoor Ladoo','Sweets',40,150,10,200,'https://images.unsplash.com/photo-1634563450917-fa254dfb2344?auto=format&fit=crop&q=80&w=200','SW-002'),
  ('p3','Soan Papdi','Sweets',15,180,10,250,'https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=200','SW-003'),
  ('p4','Aloo Bhujia','Namkeen',100,80,20,120,'https://images.unsplash.com/photo-1605337298642-e931139edaf1?auto=format&fit=crop&q=80&w=200','NM-001')
on conflict (id) do nothing;

insert into product_variants (variant_id, product_id, size_label, variant_price_modifier) values
  ('v1','p1','250g',0.25),
  ('v2','p1','500g',0.50),
  ('v3','p1','1kg',1.00),
  ('v4','p3','500g',0.50),
  ('v5','p3','1kg',1.00)
on conflict (variant_id) do nothing;

insert into dealers (id, name, address, gstin, phone) values
  ('d1','Amul Distributors','Main Road, Buxar','10AAAAA1234A1Z1','9876543210')
on conflict (id) do nothing;

insert into employees (id, name, full_name, designation_tag, phone_number, salary_type_flag, base_compensation_rate, joining_date) values
  ('e1','Ramesh Kumar','Ramesh Kumar','Cashier','9876500001','Monthly',15000,'2024-01-15'),
  ('e2','Suresh Yadav','Suresh Yadav','Chef','9876500002','Monthly',18000,'2024-02-01'),
  ('e3','Priya Sharma','Priya Sharma','Manager','9876500003','Monthly',25000,'2024-01-01')
on conflict (id) do update set
  name = excluded.name,
  full_name = excluded.full_name,
  designation_tag = excluded.designation_tag,
  phone_number = excluded.phone_number,
  salary_type_flag = excluded.salary_type_flag,
  base_compensation_rate = excluded.base_compensation_rate,
  joining_date = excluded.joining_date;

-- Seed default permissions into settings (upsert so re-runs are safe)
insert into settings (id, value) values (1, '{
  "lowStockAlerts": true,
  "dailyReportSummary": false,
  "permissions": {
    "Cashier":  { "POS Billing": "Full Access", "Orders": "Read-Only",  "Inventory": "Hidden",      "Financial Reports": "Hidden",    "Settings": "Hidden", "Employees": "Hidden" },
    "Chef":     { "POS Billing": "Hidden",      "Orders": "Full Access", "Inventory": "Read-Only",   "Financial Reports": "Hidden",    "Settings": "Hidden", "Employees": "Hidden" },
    "Manager":  { "POS Billing": "Full Access", "Orders": "Full Access", "Inventory": "Full Access", "Financial Reports": "Read-Only", "Settings": "Hidden", "Employees": "Read-Only" }
  }
}'::jsonb)
on conflict (id) do update set value = excluded.value;

insert into categories (id, name, image) values
  ('c1','Sweets','https://images.unsplash.com/photo-1626804475297-4160ebba5270?auto=format&fit=crop&q=80&w=400'),
  ('c2','Namkeen','https://images.unsplash.com/photo-1605337298642-e931139edaf1?auto=format&fit=crop&q=80&w=400'),
  ('c3','Bakery','https://images.unsplash.com/photo-1621236378699-8597ffc34082?auto=format&fit=crop&q=80&w=400'),
  ('c4','Beverages','https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&q=80&w=400'),
  ('c5','Snacks','https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&q=80&w=400')
on conflict (id) do nothing;

-- Disable RLS on all tables (service_role key bypasses anyway, but this prevents 401s)
alter table products        disable row level security;
alter table product_variants disable row level security;
alter table dealers         disable row level security;
alter table expenses        disable row level security;
alter table employees       disable row level security;
alter table attendance      disable row level security;
alter table orders          disable row level security;
alter table inventory_log   disable row level security;
alter table categories      disable row level security;
alter table settings        disable row level security;
