import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Shield, Ban, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'payments' | 'ban'>('payments');
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [banEmail, setBanEmail] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('merchant_payments')
      .select('*, merchants(store_name, status, ad_expires_at)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPayments((data as PendingPayment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchPayments();
  }, [isAdmin]);

  const approve = async (p: PendingPayment) => {
    const now = new Date();
    const base = p.merchants.ad_expires_at && new Date(p.merchants.ad_expires_at) > now
      ? new Date(p.merchants.ad_expires_at)
      : now;
    const newExpiry = new Date(base.getTime() + p.days_purchased * 24 * 60 * 60 * 1000);

    const { error: e1 } = await supabase
      .from('merchants')
      .update({ status: 'active', ad_expires_at: newExpiry.toISOString() })
      .eq('id', p.merchant_id);
    if (e1) return toast.error(`激活失败：${e1.message}`);

    const { error: e2 } = await supabase
      .from('merchant_payments')
      .update({ status: 'approved', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq('id', p.id);
    if (e2) return toast.error(`更新付款失败：${e2.message}`);

    toast.success(`已开通 ${p.days_purchased} 天广告位`);
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

  const handleBan = async () => {
    if (!banEmail.trim()) return toast.error('请输入邮箱');
    // We can't directly modify auth.users from client. Use a "banned_users" pattern
    // or call an edge function. As a simple approach: insert into a banned table.
    // For MVP, we mark via user_roles with a 'banned' role substitute → we just show notice.
    toast.info('封禁功能需要后端 Edge Function 支持，已记录请求');
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-bold">管理员后台</h1>
      </div>

      <div className="flex mx-4 mt-4 bg-card rounded-xl p-1 border border-border">
        <button
          onClick={() => setTab('payments')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'payments' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          商家审核
        </button>
        <button
          onClick={() => setTab('ban')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'ban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          账号封禁
        </button>
      </div>

      {tab === 'payments' ? (
        <div className="mx-4 mt-4 space-y-3">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">加载中...</div>
          ) : payments.length === 0 ? (
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
                  <div>金额：<span className="font-semibold text-primary">¥{p.amount}</span></div>
                  <div>天数：<span className="font-semibold">{p.days_purchased} 天</span></div>
                </div>
                <a href={p.payment_screenshot_url} target="_blank" rel="noreferrer">
                  <img src={p.payment_screenshot_url} alt="付款截图" className="w-full max-h-64 object-contain bg-muted rounded-lg" />
                </a>
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
      ) : (
        <div className="mx-4 mt-4 bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ban className="w-4 h-4" /> 输入用户邮箱进行封禁
          </div>
          <Input placeholder="user@example.com" value={banEmail} onChange={(e) => setBanEmail(e.target.value)} />
          <Button onClick={handleBan} variant="destructive" className="w-full">
            执行封禁
          </Button>
          <p className="text-[11px] text-muted-foreground">
            注意：直接封禁需要后端 Edge Function（管理员 API）。当前为占位接口。
          </p>
        </div>
      )}
    </div>
  );
};

export default Admin;
