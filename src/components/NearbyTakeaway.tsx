import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, ChevronRight } from 'lucide-react';

interface Merchant {
  id: string;
  store_name: string;
  contact_phone: string;
  ad_expires_at: string;
  products?: { image_url: string }[];
}

const NearbyTakeaway = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('id, store_name, contact_phone, ad_expires_at, products:merchant_products(image_url)')
        .eq('status', 'active')
        .gt('ad_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      setMerchants((data as Merchant[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="mx-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">附近外卖</h2>
        </div>
        {merchants.length > 0 && (
          <button
            onClick={() => navigate('/nearby')}
            className="text-xs text-muted-foreground flex items-center"
          >
            查看全部 <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-6">加载中...</div>
      ) : merchants.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
          暂无附近商家，期待商家入驻
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
          {merchants.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/merchant/${m.id}`)}
              className="flex-shrink-0 w-40 bg-card rounded-xl border border-border overflow-hidden text-left shadow-sm"
            >
              <div className="w-full h-28 bg-muted overflow-hidden">
                {m.products?.[0]?.image_url ? (
                  <img
                    src={m.products[0].image_url}
                    alt={m.store_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🍱</div>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-sm font-semibold text-foreground truncate">{m.store_name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">点击查看菜单</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NearbyTakeaway;
