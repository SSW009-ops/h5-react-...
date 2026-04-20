import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import OrderCard, { Order } from '@/components/OrderCard';
import OrderDetailDialog from '@/components/OrderDetailDialog';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const MyOrders = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'posted' | 'accepted'>('posted');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const query = tab === 'posted'
      ? supabase.from('orders').select('*').eq('creator_id', user.id)
      : supabase.from('orders').select('*').eq('runner_id', user.id);
    
    const { data } = await query.order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user, tab]);

  const handleComplete = async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', id)
      .in('status', ['in_progress', 'pending'])
      .select();
    if (error) {
      toast.error(`操作失败：${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('操作失败：无权限或订单状态不允许（请检查 RLS 策略）');
      return;
    }
    toast.success('订单已完成！');
    fetchOrders();
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('status', 'pending')
      .eq('creator_id', user!.id)
      .select();
    if (error) {
      toast.error(`删除失败：${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('删除失败：无权限或订单已被接单（请检查 RLS 策略）');
      return;
    }
    toast.success('订单已删除');
    fetchOrders();
  };

  const handleCancel = async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', runner_id: null })
      .eq('id', id)
      .in('status', ['pending', 'in_progress'])
      .eq('creator_id', user!.id)
      .select();
    if (error) {
      toast.error(`取消失败：${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('取消失败：无权限或订单状态不允许（请检查 RLS 策略）');
      return;
    }
    toast.success('订单已取消');
    fetchOrders();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground mb-4">请先登录查看订单</p>
        <Button onClick={() => navigate('/login')} className="rounded-xl">去登录</Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">我的</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <button onClick={signOut} className="text-muted-foreground p-2">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex mx-4 mt-4 bg-card rounded-xl p-1 border border-border">
        <button
          onClick={() => setTab('posted')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'posted' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          我发布的
        </button>
        <button
          onClick={() => setTab('accepted')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'accepted' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          我接的单
        </button>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-12">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            {tab === 'posted' ? '还没有发布过需求' : '还没有接过单'}
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} onClick={() => setSelectedOrder(order)} className="cursor-pointer">
              <OrderCard order={order} />
            </div>
          ))
        )}
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        canGrab={false}
        isCreator={!!selectedOrder && selectedOrder.creator_id === user.id}
        isRunner={!!selectedOrder && selectedOrder.runner_id === user.id}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />

      <BottomNav />
    </div>
  );
};

export default MyOrders;
