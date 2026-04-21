import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Upload, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import paymentQR from '@/assets/payment-qr.jpg';

interface ProductDraft {
  product_name: string;
  price: string;
  image_url: string;
  uploading?: boolean;
}

interface MerchantRow {
  id: string;
  status: string;
  store_name: string;
  ad_expires_at: string | null;
}

const MerchantOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<MerchantRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [storeName, setStoreName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWechat, setContactWechat] = useState('');
  const [products, setProducts] = useState<ProductDraft[]>([
    { product_name: '', price: '', image_url: '' },
  ]);

  // payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [createdMerchantId, setCreatedMerchantId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(30);
  const [payScreenshot, setPayScreenshot] = useState<string>('');
  const [payUploading, setPayUploading] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from('merchants')
      .select('id, status, store_name, ad_expires_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExisting(data as MerchantRow);
        setLoading(false);
      });
  }, [user]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过 5MB');
      return null;
    }
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('merchant-assets').upload(path, file);
    if (error) {
      toast.error(`上传失败：${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from('merchant-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleProductImage = async (idx: number, file: File) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, uploading: true } : p)));
    const url = await uploadImage(file);
    setProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, uploading: false, image_url: url || p.image_url } : p))
    );
  };

  const addProduct = () => {
    if (products.length >= 20) {
      toast.error('最多 20 个产品');
      return;
    }
    setProducts((p) => [...p, { product_name: '', price: '', image_url: '' }]);
  };

  const removeProduct = (idx: number) => {
    setProducts((p) => p.filter((_, i) => i !== idx));
  };

  const handleNext = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!storeName.trim()) return toast.error('请填写店铺名称');
    if (storeName.length > 50) return toast.error('店铺名称过长');
    if (!/^1[3-9]\d{9}$/.test(contactPhone.trim())) return toast.error('请填写有效的手机号');
    const validProducts = products.filter((p) => p.product_name.trim() && p.price.trim() && p.image_url);
    if (validProducts.length === 0) return toast.error('请至少添加一个产品（含名称、价格、图片）');

    setSubmitting(true);

    // upsert merchant
    const { data: merchant, error: mErr } = await supabase
      .from('merchants')
      .upsert(
        {
          user_id: user.id,
          store_name: storeName.trim(),
          contact_phone: contactPhone.trim(),
          contact_wechat: contactWechat.trim() || null,
          status: 'pending',
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (mErr || !merchant) {
      setSubmitting(false);
      toast.error(`提交失败：${mErr?.message}`);
      return;
    }

    // replace products
    await supabase.from('merchant_products').delete().eq('merchant_id', merchant.id);
    const rows = validProducts.map((p, idx) => ({
      merchant_id: merchant.id,
      product_name: p.product_name.trim().slice(0, 100),
      price: p.price.trim().slice(0, 50),
      image_url: p.image_url,
      sort_order: idx,
    }));
    const { error: pErr } = await supabase.from('merchant_products').insert(rows);
    if (pErr) {
      setSubmitting(false);
      toast.error(`产品保存失败：${pErr.message}`);
      return;
    }

    setCreatedMerchantId(merchant.id);
    setSubmitting(false);
    setPayOpen(true);
  };

  const handlePayUpload = async (file: File) => {
    setPayUploading(true);
    const url = await uploadImage(file);
    setPayUploading(false);
    if (url) setPayScreenshot(url);
  };

  const submitPayment = async () => {
    if (!user || !createdMerchantId) return;
    if (payAmount < 30) return toast.error('最低 30 元');
    if (!payScreenshot) return toast.error('请上传付款截图');

    setPaySubmitting(true);
    const { error } = await supabase.from('merchant_payments').insert({
      merchant_id: createdMerchantId,
      user_id: user.id,
      amount: payAmount,
      days_purchased: payAmount, // 1 元 = 1 天
      payment_screenshot_url: payScreenshot,
    });
    setPaySubmitting(false);

    if (error) {
      toast.error(`提交失败：${error.message}`);
      return;
    }
    toast.success('付款记录已提交，等待管理员审核');
    setPayOpen(false);
    navigate('/mine');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground mb-4">请先登录</p>
        <Button onClick={() => navigate('/login')}>去登录</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">加载中...</div>;
  }

  // already approved or pending: show status
  if (existing && existing.status !== 'rejected') {
    const isActive = existing.status === 'active' && existing.ad_expires_at && new Date(existing.ad_expires_at) > new Date();
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 border-b border-border">
          <button onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-bold">商家中心</h1>
        </div>
        <div className="mx-4 mt-6 bg-card rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-bold">{existing.store_name}</h2>
          <div className="mt-3 text-sm">
            状态：
            {isActive ? (
              <span className="text-success font-medium">广告位已激活</span>
            ) : existing.status === 'pending' ? (
              <span className="text-warning font-medium">待管理员审核</span>
            ) : (
              <span className="text-muted-foreground">已过期</span>
            )}
          </div>
          {isActive && existing.ad_expires_at && (
            <div className="mt-1 text-xs text-muted-foreground">
              到期时间：{new Date(existing.ad_expires_at).toLocaleString('zh-CN')}
            </div>
          )}
          <Button
            className="mt-5 w-full"
            onClick={() => {
              setCreatedMerchantId(existing.id);
              setPayOpen(true);
            }}
          >
            续费 / 追加广告位天数
          </Button>
        </div>
        {renderPayDialog()}
      </div>
    );
  }

  function renderPayDialog() {
    return (
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>支付广告位费用</DialogTitle>
            <DialogDescription>
              30 元起，1 元 = 1 天广告位。付款后上传截图，等待管理员审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-3 flex justify-center">
              <img src={paymentQR} alt="收款码" className="w-48 h-48 object-contain" />
            </div>
            <div>
              <Label className="text-xs">付款金额（元）</Label>
              <Input
                type="number"
                min={30}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                可获得 <span className="text-primary font-semibold">{Math.max(payAmount, 0)}</span> 天广告位
              </p>
            </div>
            <div>
              <Label className="text-xs">付款截图</Label>
              <label className="mt-1 block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePayUpload(e.target.files[0])}
                />
                <div className="border-2 border-dashed border-border rounded-lg h-32 flex items-center justify-center cursor-pointer hover:bg-muted/30">
                  {payUploading ? (
                    <span className="text-xs text-muted-foreground">上传中...</span>
                  ) : payScreenshot ? (
                    <img src={payScreenshot} alt="screenshot" className="h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1 block">点击上传</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
            <Button onClick={submitPayment} disabled={paySubmitting} className="w-full">
              {paySubmitting ? '提交中...' : '提交付款记录'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card px-4 pt-12 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-bold">商家入驻</h1>
      </div>

      <div className="mx-4 mt-5 space-y-4">
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div>
            <Label className="text-xs">店铺名称 *</Label>
            <Input value={storeName} maxLength={50} onChange={(e) => setStoreName(e.target.value)} placeholder="如：张三家小吃" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">联系电话 *</Label>
            <Input value={contactPhone} maxLength={11} onChange={(e) => setContactPhone(e.target.value)} placeholder="11 位手机号" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">微信号（选填）</Label>
            <Input value={contactWechat} maxLength={50} onChange={(e) => setContactWechat(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">主营产品 *</h3>
            <button onClick={addProduct} className="text-xs text-primary flex items-center gap-1">
              <Plus className="w-3 h-3" /> 添加
            </button>
          </div>
          <div className="space-y-3">
            {products.map((p, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">产品 {idx + 1}</span>
                  {products.length > 1 && (
                    <button onClick={() => removeProduct(idx)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder="产品名"
                  value={p.product_name}
                  maxLength={100}
                  onChange={(e) => setProducts((prev) => prev.map((x, i) => (i === idx ? { ...x, product_name: e.target.value } : x)))}
                />
                <Input
                  placeholder="价格，如 ¥15"
                  value={p.price}
                  maxLength={50}
                  onChange={(e) => setProducts((prev) => prev.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))}
                />
                <label className="block">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProductImage(idx, e.target.files[0])} />
                  <div className="border-2 border-dashed border-border rounded-lg h-28 flex items-center justify-center cursor-pointer overflow-hidden">
                    {p.uploading ? (
                      <span className="text-xs text-muted-foreground">上传中...</span>
                    ) : p.image_url ? (
                      <img src={p.image_url} alt="" className="h-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-4 h-4 mx-auto text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground mt-1 block">上传产品图</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleNext} disabled={submitting} className="w-full h-11">
          {submitting ? '提交中...' : '下一步：去付款'}
        </Button>
      </div>

      {renderPayDialog()}
    </div>
  );
};

export default MerchantOnboarding;
