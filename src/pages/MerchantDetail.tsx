import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Phone, MessageCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Merchant {
  id: string;
  store_name: string;
  contact_phone: string;
  contact_wechat: string | null;
  ad_expires_at: string;
}

interface Product {
  id: string;
  product_name: string;
  price: string;
  image_url: string;
}

const MerchantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data: m } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .gt('ad_expires_at', new Date().toISOString())
        .maybeSingle();
      setMerchant(m as Merchant);

      if (m) {
        const { data: p } = await supabase
          .from('merchant_products')
          .select('*')
          .eq('merchant_id', id)
          .order('sort_order', { ascending: true });
        setProducts((p as Product[]) || []);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">加载中...</p>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground mb-4">商家不存在或已下架</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm">返回</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-bold text-foreground truncate flex-1">{merchant.store_name}</h1>
      </div>

      {/* Store Info */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-5 text-primary-foreground shadow-md">
        <h2 className="text-xl font-bold">{merchant.store_name}</h2>
        <p className="text-sm opacity-90 mt-1">营业中 · 附近外卖</p>
        <div className="flex gap-2 mt-3">
          <a
            href={`tel:${merchant.contact_phone}`}
            className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            <Phone className="w-3 h-3" /> {merchant.contact_phone}
          </a>
          {merchant.contact_wechat && (
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium">
              <MessageCircle className="w-3 h-3" /> 微信：{merchant.contact_wechat}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="mx-4 mt-5">
        <h3 className="text-base font-bold text-foreground mb-3">主营产品</h3>
        {products.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">暂未上架产品</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="w-full aspect-square bg-muted overflow-hidden">
                  <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="text-sm font-medium text-foreground truncate">{p.product_name}</div>
                  <div className="text-sm font-bold text-primary mt-1">{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MerchantDetail;
