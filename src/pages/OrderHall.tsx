import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import OrderCard, { Order } from '@/components/OrderCard';
import OrderDetailDialog from '@/components/OrderDetailDialog';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

const OrderHall = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { user } = useAuth();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleGrab = async (id: string) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    const { error } = await supabase
      .from('orders')
      .update({ status: 'in_progress', runner_id: user.id })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) {
      toast.error('抢单失败，请重试');
      return;
    }
    toast.success('抢单成功！');
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card px-4 pt-12 pb-4">
        <h1 className="text-lg font-bold text-foreground">抢单大厅</h1>
        <p className="text-xs text-muted-foreground mt-0.5">选择你想接的订单</p>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-12">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">暂无待接订单</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} onClick={() => setSelectedOrder(order)} className="cursor-pointer">
              <OrderCard
                order={order}
              />
            </div>
          ))
        )}
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        canGrab={!!user && !!selectedOrder && selectedOrder.creator_id !== user.id}
        onGrab={handleGrab}
      />

      <BottomNav />
    </div>
  );
};

export default OrderHall;
