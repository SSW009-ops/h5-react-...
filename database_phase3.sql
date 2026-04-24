-- ===========================================================
-- Phase 3 数据库升级脚本：管理员封禁/解封用户
-- 在 Supabase Dashboard → SQL Editor 执行
-- ===========================================================

-- 1) admin_list_users 升级：附带 banned_until 字段
create or replace function public.admin_list_users()
returns table (id uuid, email text, created_at timestamptz, banned_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.banned_until
    from auth.users u
    order by u.created_at desc;
end;
$$;

-- 2) 封禁用户（默认 100 年；可传入自定义到期时间）
create or replace function public.admin_ban_user(target_user_id uuid, until timestamptz default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'cannot ban yourself';
  end if;
  update auth.users
    set banned_until = coalesce(until, now() + interval '100 years')
    where id = target_user_id;
end;
$$;

-- 3) 解封用户
create or replace function public.admin_unban_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  update auth.users
    set banned_until = null
    where id = target_user_id;
end;
$$;

-- 完成
