import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import OrderCard, { Order } from '@/components/OrderCard';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const MyOrders = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'posted' | 'accepted'>('posted');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      const query = tab === 'posted'
        ? supabase.from('orders').select('*').eq('creator_id', user.id)
        : supabase.from('orders').select('*').eq('runner_id', user.id);
      
      const { data } = await query.order('created_at', { ascending: false });
      setOrders((data as Order[]) || []);
      setLoading(false);
    };
    fetchOrders();
  }, [user, tab]);

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

      {/* Tabs */}
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
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyOrders;
