import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('请填写邮箱和密码');
      return;
    }
    if (password.length < 6) {
      toast.error('密码至少6位');
      return;
    }

    if (isLogin) {
      setLoading(true);
      try {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('登录成功');
        navigate('/');
      } catch (err: any) {
        toast.error(err.message || '登录失败');
      } finally {
        setLoading(false);
      }
    } else {
      // Show disclaimer before registering
      setShowDisclaimer(true);
    }
  };

  const handleAgreeAndRegister = async () => {
    setShowDisclaimer(false);
    setLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) throw error;
      toast.success('注册成功，请查看邮箱确认');
    } catch (err: any) {
      toast.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">小区跑腿</h1>
          <p className="text-muted-foreground text-sm mt-1">您身边的跑腿帮手</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-card"
          />
          <Input
            type="password"
            placeholder="请输入密码（至少6位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl bg-card"
          />
          <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium ml-1"
          >
            {isLogin ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>

      {/* Disclaimer Dialog */}
      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent className="max-w-sm mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">免责声明</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本平台仅提供信息撮合服务，交易过程中发生的任何损失、纠纷均与平台无关，由交易双方自行承担责任。
          </p>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDisclaimer(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleAgreeAndRegister}>
              同意并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
