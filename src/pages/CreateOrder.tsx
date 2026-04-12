import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

const CreateOrder = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    if (!title.trim() || !description.trim() || !reward.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    const rewardNum = parseFloat(reward);
    if (isNaN(rewardNum) || rewardNum <= 0) {
      toast.error('请输入有效的报酬金额');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('orders').insert({
      title: title.trim(),
      description: description.trim(),
      reward: rewardNum,
      status: 'pending',
      creator_id: user.id,
    });

    if (error) {
      toast.error('发布失败，请重试');
    } else {
      toast.success('发布成功！');
      navigate('/hall');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card px-4 pt-12 pb-4">
        <h1 className="text-lg font-bold text-foreground">发布跑腿需求</h1>
        <p className="text-xs text-muted-foreground mt-0.5">填写需求信息，等待跑腿员接单</p>
      </div>

      <form onSubmit={handleSubmit} className="mx-4 mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">需求标题</label>
          <Input
            placeholder="例如：帮忙取快递"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl bg-card"
            maxLength={50}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">详细描述</label>
          <Textarea
            placeholder="请描述具体需求，如地点、时间等"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl bg-card min-h-[120px]"
            maxLength={500}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">报酬金额（元）</label>
          <Input
            type="number"
            placeholder="请输入报酬金额"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="h-12 rounded-xl bg-card"
            min="0"
            step="0.01"
          />
        </div>
        <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold mt-2" disabled={loading}>
          {loading ? '发布中...' : '立即发布'}
        </Button>
      </form>

      <BottomNav />
    </div>
  );
};

export default CreateOrder;
