import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useFoodCart } from '@/hooks/useFoodCart';

interface Merchant {
  id: string;
  store_name: string;
  contact_phone: string;
  contact_wechat: string | null;
  ad_expires_at: string;
  is_open: boolean;
  payment_qr_url: string | null;
  intro?: string | null;
}

interface Product {
  id: string;
  product_name: string;
  price: string;
  image_url: string;
}

const parsePrice = (p: string): number => {
  const m = String(p || '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

const MerchantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useFoodCart();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<Product | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [contact, setContact] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: m } = await supabase
        .from('merchants')
        .select('id, store_name, contact_phone, contact_wechat, ad_expires_at, is_open, payment_qr_url')
        .eq('id', id)
        .eq('status', 'active')
        .gt('ad_expires_at', new Date().toISOString())
        .maybeSingle();
      setMerchant(m as Merchant);

      if (m) {
        const { data: p } = await supabase
          .from('merchant_products')
          .select('id, product_name, price, image_url')
          .eq('merchant_id', id)
          .order('sort_order', { ascending: true });
        setProducts((p as Product[]) || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const tryAdd = (p: Product) => {
    if (!merchant) return;
    if (!merchant.is_open) {
      toast.error('商家休息中，暂不可下单');
      return;
    }
    if (cart.state.merchant_id && cart.state.merchant_id !== merchant.id) {
      setPendingItem(p);
      setSwitchOpen(true);
      return;
    }
    cart.addItem(
      { product_id: p.id, product_name: p.product_name, unit_price: parsePrice(p.price), image_url: p.image_url },
      merchant.id,
      merchant.store_name,
    );
  };

  const confirmSwitch = () => {
    if (!merchant || !pendingItem) return;
    cart.setMerchant(merchant.id, merchant.store_name);
    cart.addItem(
      {
        product_id: pendingItem.id,
        product_name: pendingItem.product_name,
        unit_price: parsePrice(pendingItem.price),
        image_url: pendingItem.image_url,
      },
      merchant.id,
      merchant.store_name,
    );
    setPendingItem(null);
    setSwitchOpen(false);
  };

  const getQty = (pid: string) =>
    cart.state.items.find((i) => i.product_id === pid)?.quantity || 0;

  const openConfirm = () => {
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    if (cart.state.items.length === 0) return;
    setConfirmOpen(true);
  };

  const proceedToPay = () => {
    if (!contact.trim()) return toast.error('请填写联系方式');
    if (contact.length > 100) return toast.error('联系方式过长');
    if (remark.length > 50) return toast.error('备注最多 50 字');
    if (!merchant?.payment_qr_url) return toast.error('商家未配置收款码，无法下单');
    setConfirmOpen(false);
    setPayOpen(true);
  };

  const submitOrder = async () => {
    if (!user || !merchant) return;
    setSubmitting(true);
    const total = cart.total;
    const { data: order, error } = await supabase
      .from('food_orders')
      .insert({
        merchant_id: merchant.id,
        user_id: user.id,
        total_price: total,
        status: 'pending_confirm',
        remark: remark.trim() || null,
        contact: contact.trim(),
        delivery_type: 'takeout',
      })
      .select()
      .single();

    if (error || !order) {
      setSubmitting(false);
      toast.error(`下单失败：${error?.message}`);
      return;
    }

    const items = cart.state.items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    }));
    const { error: iErr } = await supabase.from('food_order_items').insert(items);
    setSubmitting(false);
    if (iErr) {
      toast.error(`下单失败：${iErr.message}`);
      return;
    }
    cart.clear();
    setPayOpen(false);
    toast.success('下单成功，等待商家确认');
    navigate('/food-orders');
  };

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

  const cartActiveForThis =
    cart.state.merchant_id === merchant.id && cart.state.items.length > 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-bold text-foreground truncate flex-1">{merchant.store_name}</h1>
      </div>

      <div className="mx-4 mt-4 bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-5 text-primary-foreground shadow-md">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{merchant.store_name}</h2>
          {merchant.is_open ? (
            <span className="text-[11px] bg-success text-success-foreground rounded-full px-2 py-0.5">营业中</span>
          ) : (
            <span className="text-[11px] bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">休息中</span>
          )}
        </div>
        <p className="text-sm opacity-90 mt-1">📞 {merchant.contact_phone}</p>
        {merchant.contact_wechat && (
          <p className="text-sm opacity-90 mt-0.5">微信：{merchant.contact_wechat}</p>
        )}
      </div>

      <div className="mx-4 mt-5">
        <h3 className="text-base font-bold text-foreground mb-3">菜单</h3>
        {products.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">暂未上架产品</div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => {
              const qty = getQty(p.id);
              return (
                <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex gap-3 items-center shadow-sm">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.product_name}</div>
                    <div className="text-base font-bold text-primary mt-1">¥{parsePrice(p.price).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => cart.removeItem(p.id)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-medium w-5 text-center">{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => tryAdd(p)}
                      disabled={!merchant.is_open}
                      className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 悬浮购物车 */}
      {cartActiveForThis && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
          <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl shadow-lg p-3 flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {cart.count}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">合计</div>
              <div className="text-base font-bold text-primary">¥{cart.total.toFixed(2)}</div>
            </div>
            <Button onClick={openConfirm} className="rounded-full px-5">去结算</Button>
          </div>
        </div>
      )}

      {/* 切换商家提示 */}
      <AlertDialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>切换商家</AlertDialogTitle>
            <AlertDialogDescription>
              切换商家会清空购物车，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingItem(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>继续</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 确认订单 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认订单</DialogTitle>
            <DialogDescription>请核对订单信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 space-y-1.5 max-h-44 overflow-y-auto">
              {cart.state.items.map((i) => (
                <div key={i.product_id} className="flex justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{i.product_name} × {i.quantity}</span>
                  <span className="text-muted-foreground">¥{(i.unit_price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                <span className="text-sm font-bold">合计</span>
                <span className="text-base font-bold text-primary">¥{cart.total.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">备注（最多 50 字）</Label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value.slice(0, 50))}
                placeholder="口味要求、加料备注等"
                className="mt-1 min-h-[60px]"
              />
            </div>
            <div>
              <Label className="text-xs">联系方式 *</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="手机号或微信号"
                maxLength={100}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={proceedToPay} className="w-full">确认下单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 扫码支付 */}
      <Dialog open={payOpen} onOpenChange={(o) => !submitting && setPayOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>请扫码完成支付</DialogTitle>
            <DialogDescription>付款完成后点击下方按钮提交订单</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-3">
            {merchant.payment_qr_url ? (
              <img src={merchant.payment_qr_url} alt="收款码" className="w-60 h-60 object-contain rounded-lg border border-border" />
            ) : (
              <div className="text-sm text-muted-foreground">商家未配置收款码</div>
            )}
            <div className="text-base font-bold text-primary">需支付 ¥{cart.total.toFixed(2)}</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={submitting} className="flex-1">
              <X className="w-4 h-4 mr-1" /> 取消
            </Button>
            <Button onClick={submitOrder} disabled={submitting} className="flex-1">
              {submitting ? '提交中...' : '我已完成支付'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantDetail;
