-- ===========================================================
-- Phase 2 数据库升级脚本
-- 在 Supabase Dashboard → SQL Editor 执行
-- ===========================================================

-- 1) merchants 表增加 3 个资质字段（必填）
alter table public.merchants
  add column if not exists business_license_url text,
  add column if not exists food_license_url text,
  add column if not exists storefront_photo_url text;

-- 2) 允许商家本人删除自己处于 pending/rejected/expired 状态的入驻申请
drop policy if exists "merchants delete own pending" on public.merchants;
create policy "merchants delete own pending"
  on public.merchants for delete
  to authenticated
  using (
    user_id = auth.uid()
    and status in ('pending', 'rejected', 'expired')
  );

-- 3) 管理员获取所有用户（邮箱+注册时间）的 RPC
create or replace function public.admin_list_users()
returns table (id uuid, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  return query
    select u.id, u.email::text, u.created_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

-- 4) 管理员根据 user_id 列表获取邮箱（用于订单列表展示发布者邮箱）
create or replace function public.admin_get_user_emails(user_ids uuid[])
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  return query
    select u.id, u.email::text
    from auth.users u
    where u.id = any(user_ids);
end;
$$;

-- 5) 管理员手动下架商家（一键置为 expired，并将 ad_expires_at 置过去）
create or replace function public.admin_takedown_merchant(merchant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  update public.merchants
    set status = 'expired',
        ad_expires_at = now()
    where id = merchant_id;
end;
$$;

-- 6) 管理员让所有过期的商家自动 status=expired（可选维护函数）
create or replace function public.admin_sync_expired_merchants()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  update public.merchants
    set status = 'expired'
    where status = 'active'
      and ad_expires_at is not null
      and ad_expires_at <= now();
end;
$$;

-- 完成
