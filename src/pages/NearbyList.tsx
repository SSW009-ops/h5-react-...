import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Merchant {
  id: string;
  store_name: string;
  contact_phone: string;
  products?: { image_url: string }[];
}

const NearbyList = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('id, store_name, contact_phone, products:merchant_products(image_url)')
        .eq('status', 'active')
        .gt('ad_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      setMerchants((data as Merchant[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-bold text-foreground">附近外卖</h1>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-12">加载中...</div>
        ) : merchants.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">暂无入驻商家</div>
        ) : (
          merchants.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/merchant/${m.id}`)}
              className="w-full bg-card rounded-xl border border-border overflow-hidden flex gap-3 p-3 shadow-sm text-left"
            >
              <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {m.products?.[0]?.image_url ? (
                  <img src={m.products[0].image_url} alt={m.store_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🍱</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-foreground truncate">{m.store_name}</div>
                <div className="text-xs text-muted-foreground mt-1">📞 {m.contact_phone}</div>
                <div className="text-xs text-primary mt-2">查看菜单 →</div>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NearbyList;
