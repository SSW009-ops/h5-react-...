-- ===========================================================
-- Phase 4: 附近外卖 点餐下单
-- 在 Supabase Dashboard → SQL Editor 执行
-- ===========================================================

-- 1) merchants 增加字段
alter table public.merchants
  add column if not exists is_open boolean not null default true,
  add column if not exists payment_qr_url text;

-- 2) food_orders
create table if not exists public.food_orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_price numeric(10,2) not null default 0,
  status text not null default 'pending_confirm',
  remark text,
  contact text not null,
  delivery_type text not null default 'takeout',
  merchant_note text,
  is_deleted_by_user boolean not null default false,
  is_deleted_by_merchant boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists food_orders_user_idx on public.food_orders(user_id, created_at desc);
create index if not exists food_orders_merchant_idx on public.food_orders(merchant_id, created_at desc);

-- 3) food_order_items
create table if not exists public.food_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.food_orders(id) on delete cascade,
  product_id uuid references public.merchant_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0)
);
create index if not exists food_order_items_order_idx on public.food_order_items(order_id);

-- 4) RLS
alter table public.food_orders enable row level security;
alter table public.food_order_items enable row level security;

-- food_orders policies
drop policy if exists "user select own food orders" on public.food_orders;
create policy "user select own food orders" on public.food_orders
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "user insert own food orders" on public.food_orders;
create policy "user insert own food orders" on public.food_orders
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user update own food orders" on public.food_orders;
create policy "user update own food orders" on public.food_orders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- merchant can update their orders (status / merchant_note / is_deleted_by_merchant)
-- is_deleted_by_merchant 仅当 is_deleted_by_user = true 时允许商家更新（用 trigger 校验）
drop policy if exists "merchant update own merchant orders" on public.food_orders;
create policy "merchant update own merchant orders" on public.food_orders
  for update to authenticated
  using (exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = auth.uid()));

create or replace function public.check_food_order_merchant_delete()
returns trigger language plpgsql as $$
begin
  if NEW.is_deleted_by_merchant = true and OLD.is_deleted_by_merchant = false then
    if NEW.is_deleted_by_user <> true then
      raise exception 'merchant can only delete after user has deleted';
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_check_food_order_merchant_delete on public.food_orders;
create trigger trg_check_food_order_merchant_delete
  before update on public.food_orders
  for each row execute function public.check_food_order_merchant_delete();

-- food_order_items policies (跟随 food_orders)
drop policy if exists "select food order items via order" on public.food_order_items;
create policy "select food order items via order" on public.food_order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.food_orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or exists (select 1 from public.merchants m where m.id = o.merchant_id and m.user_id = auth.uid())
          or public.has_role(auth.uid(), 'admin')
        )
    )
  );

drop policy if exists "insert food order items by owner" on public.food_order_items;
create policy "insert food order items by owner" on public.food_order_items
  for insert to authenticated
  with check (
    exists (select 1 from public.food_orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- 5) Realtime
alter publication supabase_realtime add table public.food_orders;
