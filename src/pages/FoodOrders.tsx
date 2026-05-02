import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

interface FoodOrder {
  id: string;
  merchant_id: string;
  total_price: number;
  status: string;
  remark: string | null;
  merchant_note: string | null;
  contact: string;
  created_at: string;
  merchants?: { store_name: string } | null;
  food_order_items?: { product_name: string; quantity: number; unit_price: number }[];
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending_confirm: { label: '待确认', cls: 'bg-warning/15 text-warning' },
  accepted: { label: '已接单', cls: 'bg-blue-500/15 text-blue-600' },
  preparing: { label: '制作中', cls: 'bg-orange-500/15 text-orange-600' },
  completed: { label: '已完成', cls: 'bg-success/15 text-success' },
  cancelled: { label: '已取消', cls: 'bg-muted text-muted-foreground' },
};

const FoodOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('food_orders')
      .select('*, merchants(store_name), food_order_items(product_name, quantity, unit_price)')
      .eq('user_id', user.id)
      .eq('is_deleted_by_user', false)
      .order('created_at', { ascending: false });
    setOrders((data as FoodOrder[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`food_orders_user_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'food_orders', filter: `user_id=eq.${user.id}` },
        () => fetchOrders(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const deleteOrder = async (id: string) => {
    if (!confirm('确认删除该订单？')) return;
    const { error } = await supabase
      .from('food_orders')
      .update({ is_deleted_by_user: true })
      .eq('id', id);
    if (error) return toast.error(`删除失败：${error.message}`);
    toast.success('已删除');
    fetchOrders();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-20">
        <p className="text-muted-foreground mb-4">请先登录</p>
        <button onClick={() => navigate('/login')} className="text-primary text-sm">去登录</button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-bold text-foreground">我的外卖订单</h1>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">还没有外卖订单</div>
        ) : (
          orders.map((o) => {
            const s = STATUS_MAP[o.status] || { label: o.status, cls: 'bg-muted text-muted-foreground' };
            const showNote = (o.status === 'completed' || o.status === 'cancelled') && o.merchant_note;
            return (
              <div key={o.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-foreground truncate flex-1 mr-2">
                    {o.merchants?.store_name || '商家已下架'}
                  </div>
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${s.cls}`}>{s.label}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleString('zh-CN')}
                </div>
                <div className="mt-2 space-y-0.5">
                  {(o.food_order_items || []).map((it, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                      <span className="truncate flex-1 mr-2">{it.product_name} × {it.quantity}</span>
                      <span>¥{(it.unit_price * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {o.remark && (
                  <div className="mt-2 text-xs text-muted-foreground">备注：{o.remark}</div>
                )}
                {showNote && (
                  <div className="mt-2 text-xs bg-muted rounded-md p-2">
                    商家留言：{o.merchant_note}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm">
                    合计 <span className="text-base font-bold text-primary">¥{Number(o.total_price).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => deleteOrder(o.id)}
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FoodOrders;
