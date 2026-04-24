import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import BannerCarousel from '@/components/BannerCarousel';
import NearbyTakeaway from '@/components/NearbyTakeaway';
import OrderCard, { Order } from '@/components/OrderCard';
import BottomNav from '@/components/BottomNav';
import { Package } from 'lucide-react';

const Index = () => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentOrders((data as Order[]) || []);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Package className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">小区跑腿</h1>
          <p className="text-xs text-muted-foreground">快速便捷的社区服务</p>
        </div>
      </div>

      <BannerCarousel />

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mx-4 mt-5">
        {[
          { emoji: '🛒', label: '代买' },
          { emoji: '📦', label: '取快递' },
          { emoji: '🍜', label: '代取餐' },
          { emoji: '🔧', label: '其他' },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl p-3 flex flex-col items-center gap-1.5 shadow-sm border border-border">
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-xs font-medium text-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Nearby Takeaway */}
      <NearbyTakeaway />

      {/* Recent Orders */}
      <div className="mx-4 mt-6">
        <h2 className="text-base font-bold text-foreground mb-3">最新需求</h2>
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-8">加载中...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">暂无需求，快去发布吧</div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
