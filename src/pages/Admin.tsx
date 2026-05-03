import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Shield, Check, X, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PendingPayment {
  id: string;
  merchant_id: string;
  user_id: string;
  amount: number;
  days_purchased: number;
  payment_screenshot_url: string;
  created_at: string;
  merchants: { store_name: string; status: string; ad_expires_at: string | null };
}

interface ActiveMerchant {
  id: string;
  store_name: string;
  contact_phone: string;
  status: string;
  ad_expires_at: string | null;
  user_id: string;
}

interface OrderRow {
  id: string;
  title: string;
  status: string;
  reward: number;
  creator_id: string;
  created_at: string;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  banned_until: string | null;
}

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'payments' | 'merchants' | 'orders' | 'users'>('payments');

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [approveDays, setApproveDays] = useState<Record<string, number>>({});
  const [merchants, setMerchants] = useState<ActiveMerchant[]>([]);
  const [merchantStats, setMerchantStats] = useState<Record<string, { total: number; recent7: number }>>({});
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('merchant_payments')
      .select('*, merchants(store_name, status, ad_expires_at)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    const list = (data as PendingPayment[]) || [];
    setPayments(list);
    // default approve days = days_purchased from submission
    const d: Record<string, number> = {};
    list.forEach((p) => (d[p.id] = p.days_purchased || 30));
    setApproveDays(d);
    setLoading(false);
  };

  const fetchMerchants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('merchants')
      .select('id, store_name, contact_phone, status, ad_expires_at, user_id')
      .in('status', ['active', 'pending'])
      .order('ad_expires_at', { ascending: false, nullsFirst: false });
    const list = (data as ActiveMerchant[]) || [];
    setMerchants(list);
    setLoading(false);
    // fetch order stats per merchant
    if (list.length) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const stats: Record<string, { total: number; recent7: number }> = {};
      await Promise.all(
        list.map(async (m) => {
          const [{ count: total }, { count: recent7 }] = await Promise.all([
            supabase.from('food_orders').select('id', { count: 'exact', head: true }).eq('merchant_id', m.id),
            supabase.from('food_orders').select('id', { count: 'exact', head: true }).eq('merchant_id', m.id).gte('created_at', sevenDaysAgo),
          ]);
          stats[m.id] = { total: total || 0, recent7: recent7 || 0 };
        }),
      );
      setMerchantStats(stats);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, title, status, reward, creator_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    const rows = (data as OrderRow[]) || [];
    setOrders(rows);
    // load creator emails
    const ids = Array.from(new Set(rows.map((r) => r.creator_id)));
    if (ids.length) {
      const { data: emails } = await supabase.rpc('admin_get_user_emails', { user_ids: ids });
      const map: Record<string, string> = { ...emailMap };
      (emails as { id: string; email: string }[] | null)?.forEach((e) => (map[e.id] = e.email));
      setEmailMap(map);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) toast.error(`加载失败：${error.message}`);
    setUsers((data as UserRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'payments') fetchPayments();
    else if (tab === 'merchants') fetchMerchants();
    else if (tab === 'orders') fetchOrders();
    else if (tab === 'users') fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  const approve = async (p: PendingPayment) => {
    const days = approveDays[p.id];
    if (!days || days < 1) return toast.error('请填写有效的开通天数');

    const now = new Date();
    const base = p.merchants.ad_expires_at && new Date(p.merchants.ad_expires_at) > now
      ? new Date(p.merchants.ad_expires_at)
      : now;
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    const { error: e1 } = await supabase
      .from('merchants')
      .update({ status: 'active', ad_expires_at: newExpiry.toISOString() })
      .eq('id', p.merchant_id);
    if (e1) return toast.error(`激活失败：${e1.message}`);

    const { error: e2 } = await supabase
      .from('merchant_payments')
      .update({
        status: 'approved',
        days_purchased: days,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', p.id);
    if (e2) return toast.error(`更新付款失败：${e2.message}`);

    toast.success(`已开通 ${days} 天广告位`);
    fetchPayments();
  };

  const reject = async (p: PendingPayment) => {
    const { error } = await supabase
      .from('merchant_payments')
      .update({ status: 'rejected', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('已驳回');
    fetchPayments();
  };

  const takedown = async (m: ActiveMerchant) => {
    if (!confirm(`确认下架「${m.store_name}」？`)) return;
    const { error } = await supabase.rpc('admin_takedown_merchant', { merchant_id: m.id });
    if (error) return toast.error(`下架失败：${error.message}`);
    toast.success('已下架');
    fetchMerchants();
  };

  const banUser = async (u: UserRow) => {
    if (!confirm(`确认封禁账号 ${u.email}？封禁后该用户将无法登录。`)) return;
    const { error } = await supabase.rpc('admin_ban_user', { target_user_id: u.id, until: null });
    if (error) return toast.error(`封禁失败：${error.message}`);
    toast.success('已封禁');
    fetchUsers();
  };

  const unbanUser = async (u: UserRow) => {
    const { error } = await supabase.rpc('admin_unban_user', { target_user_id: u.id });
    if (error) return toast.error(`解封失败：${error.message}`);
    toast.success('已解封');
    fetchUsers();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">请先登录</p>
        <Button onClick={() => navigate('/login')}>去登录</Button>
      </div>
    );
  }

  if (roleLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">校验权限中...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">无权限访问</p>
        <Button onClick={() => navigate(-1)} variant="ghost" className="mt-3">返回</Button>
      </div>
    );
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'payments', label: '商家审核' },
    { key: 'merchants', label: '已入驻' },
    { key: 'orders', label: '订单' },
    { key: 'users', label: '用户' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-bold">管理员后台</h1>
      </div>

      <div className="flex mx-4 mt-4 bg-card rounded-xl p-1 border border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-sm text-muted-foreground py-8">加载中...</div>
      )}

      {!loading && tab === 'payments' && (
        <div className="mx-4 mt-4 space-y-3">
          {payments.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">暂无待审核付款</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div>
                  <div className="font-semibold text-foreground">{p.merchants.store_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(p.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <div>付款金额（参考）：<span className="font-semibold text-primary">¥{p.amount}</span></div>
                  <div>申请天数（参考）：<span className="font-semibold">{p.days_purchased} 天</span></div>
                </div>
                <a href={p.payment_screenshot_url} target="_blank" rel="noreferrer">
                  <img src={p.payment_screenshot_url} alt="付款截图" className="w-full max-h-64 object-contain bg-muted rounded-lg" />
                </a>
                <div>
                  <Label className="text-xs">实际开通天数（可自由填写，不受付款金额约束）</Label>
                  <Input
                    type="number"
                    min={1}
                    value={approveDays[p.id] ?? ''}
                    onChange={(e) => setApproveDays((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approve(p)} className="flex-1 bg-success hover:bg-success/90">
                    <Check className="w-4 h-4 mr-1" /> 通过
                  </Button>
                  <Button onClick={() => reject(p)} variant="destructive" className="flex-1">
                    <X className="w-4 h-4 mr-1" /> 驳回
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === 'merchants' && (
        <div className="mx-4 mt-4 space-y-3">
          {merchants.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">暂无商家</div>
          ) : (
            merchants.map((m) => {
              const isActive = m.status === 'active' && m.ad_expires_at && new Date(m.ad_expires_at) > new Date();
              return (
                <div key={m.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground truncate">{m.store_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.contact_phone}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      外卖订单：总 {merchantStats[m.id]?.total ?? '-'} · 近7日 {merchantStats[m.id]?.recent7 ?? '-'}
                    </div>
                    <div className="text-xs mt-1">
                      {isActive ? (
                        <span className="text-success">展示中 · 到期 {new Date(m.ad_expires_at!).toLocaleDateString('zh-CN')}</span>
                      ) : (
                        <span className="text-muted-foreground">{m.status === 'pending' ? '待付款审核' : '已下架/过期'}</span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <Button onClick={() => takedown(m)} variant="destructive" size="sm">
                      <Power className="w-3.5 h-3.5 mr-1" /> 下架
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {!loading && tab === 'orders' && (
        <div className="mx-4 mt-4 space-y-2">
          {orders.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">暂无订单</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm text-foreground truncate flex-1">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.status}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  发布者：<span className="text-foreground">{emailMap[o.creator_id] || o.creator_id.slice(0, 8)}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground flex justify-between">
                  <span>{new Date(o.created_at).toLocaleString('zh-CN')}</span>
                  <span className="text-primary font-semibold">¥{o.reward}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === 'users' && (
        <div className="mx-4 mt-4 space-y-2">
          <div className="text-xs text-muted-foreground px-1">共 {users.length} 个用户</div>
          {users.map((u) => {
            const isBanned = !!u.banned_until && new Date(u.banned_until) > new Date();
            return (
              <div key={u.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground break-all">{u.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">注册：{new Date(u.created_at).toLocaleString('zh-CN')}</div>
                    <div className="text-[11px] text-muted-foreground/70 break-all mt-0.5">UID: {u.id}</div>
                    {isBanned && (
                      <div className="mt-1 text-xs text-destructive font-medium">已封禁</div>
                    )}
                  </div>
                  {u.id !== user?.id && (
                    isBanned ? (
                      <Button size="sm" variant="outline" onClick={() => unbanUser(u)}>解封</Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => banUser(u)}>封禁</Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Admin;
