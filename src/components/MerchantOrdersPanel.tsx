import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}
interface MOrder {
  id: string;
  total_price: number;
  status: string;
  remark: string | null;
  contact: string;
  delivery_type: string;
  merchant_note: string | null;
  is_deleted_by_user: boolean;
  is_deleted_by_merchant: boolean;
  created_at: string;
  food_order_items?: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending_confirm: { label: '待确认', cls: 'bg-warning/15 text-warning' },
  accepted: { label: '已接单', cls: 'bg-blue-500/15 text-blue-600' },
  preparing: { label: '制作中', cls: 'bg-orange-500/15 text-orange-600' },
  completed: { label: '已完成', cls: 'bg-success/15 text-success' },
  cancelled: { label: '已取消', cls: 'bg-muted text-muted-foreground' },
};

interface Props {
  merchantId: string;
}

const MerchantOrdersPanel = ({ merchantId }: Props) => {
  const [orders, setOrders] = useState<MOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');
  const blinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('food_orders')
      .select('*, food_order_items(product_name, quantity, unit_price)')
      .eq('merchant_id', merchantId)
      .eq('is_deleted_by_merchant', false)
      .order('created_at', { ascending: false });
    setOrders((data as MOrder[]) || []);
    setLoading(false);
  };

  const startBlink = () => {
    if (blinkTimerRef.current) return;
    let on = false;
    blinkTimerRef.current = setInterval(() => {
      document.title = on ? originalTitleRef.current : '【新单】外卖订单';
      on = !on;
    }, 800);
  };
  const stopBlink = () => {
    if (blinkTimerRef.current) {
      clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
      document.title = originalTitleRef.current;
    }
  };

  useEffect(() => {
    fetchOrders();
    const handleVis = () => {
      if (document.visibilityState === 'visible') stopBlink();
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      stopBlink();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  useEffect(() => {
    const ch = supabase
      .channel(`food_orders_merchant_${merchantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_orders', filter: `merchant_id=eq.${merchantId}` },
        () => {
          toast.success('新订单！请及时处理');
          startBlink();
          fetchOrders();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'food_orders', filter: `merchant_id=eq.${merchantId}` },
        () => fetchOrders(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  const updateStatus = async (id: string, patch: Partial<MOrder>) => {
    const { error } = await supabase.from('food_orders').update(patch).eq('id', id);
    if (error) return toast.error(`操作失败：${error.message}`);
    toast.success('已更新');
    fetchOrders();
  };

  const reject = async (o: MOrder) => {
    const reason = prompt('请填写拒单原因');
    if (!reason) return;
    await updateStatus(o.id, { status: 'cancelled', merchant_note: reason });
  };

  const merchantDelete = async (id: string) => {
    if (!confirm('确认删除此订单记录？')) return;
    const { error } = await supabase
      .from('food_orders')
      .update({ is_deleted_by_merchant: true })
      .eq('id', id);
    if (error) return toast.error(`删除失败：${error.message}`);
    toast.success('已删除');
    fetchOrders();
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">加载中...</div>;
  if (orders.length === 0) return <div className="text-center text-sm text-muted-foreground py-8">暂无外卖订单</div>;

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const s = STATUS_MAP[o.status] || { label: o.status, cls: 'bg-muted text-muted-foreground' };
        const isCancelled = o.status === 'cancelled';
        return (
          <div
            key={o.id}
            className={`bg-card rounded-xl border border-border p-4 shadow-sm ${isCancelled ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-foreground">{o.contact}</div>
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
            {o.merchant_note && (
              <div className="mt-2 text-xs bg-muted rounded-md p-2">商家留言：{o.merchant_note}</div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm">
                合计 <span className="text-base font-bold text-primary">¥{Number(o.total_price).toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {!isCancelled && o.status === 'pending_confirm' && (
                  <>
                    <button
                      onClick={() => updateStatus(o.id, { status: 'accepted' })}
                      className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground"
                    >接单</button>
                    <button
                      onClick={() => reject(o)}
                      className="text-xs px-3 py-1 rounded-md bg-destructive text-destructive-foreground"
                    >拒绝</button>
                  </>
                )}
                {!isCancelled && o.status === 'accepted' && (
                  <button
                    onClick={() => updateStatus(o.id, { status: 'preparing' })}
                    className="text-xs px-3 py-1 rounded-md bg-orange-500 text-white"
                  >开始制作</button>
                )}
                {!isCancelled && o.status === 'preparing' && (
                  <button
                    onClick={() => updateStatus(o.id, { status: 'completed' })}
                    className="text-xs px-3 py-1 rounded-md bg-success text-success-foreground"
                  >完成</button>
                )}
                {o.is_deleted_by_user && (
                  <button
                    onClick={() => merchantDelete(o.id)}
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 用户已删除，可删除本记录
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MerchantOrdersPanel;
