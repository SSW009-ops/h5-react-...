import { Clock, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Order {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  creator_id: string;
  runner_id: string | null;
  contact: string | null;
  created_at: string;
}

interface OrderCardProps {
  order: Order;
  onGrab?: (id: string) => void;
  showGrab?: boolean;
  statusLabel?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '待接单', className: 'bg-warning/10 text-warning' },
  in_progress: { label: '进行中', className: 'bg-primary/10 text-primary' },
  completed: { label: '已完成', className: 'bg-success/10 text-success' },
  cancelled: { label: '已取消', className: 'bg-destructive/10 text-destructive' },
};

const OrderCard = ({ order, onGrab, showGrab = false }: OrderCardProps) => {
  const status = statusMap[order.status] || statusMap.pending;
  const timeAgo = getTimeAgo(order.created_at);

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-foreground text-sm flex-1 mr-2 line-clamp-1">{order.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
          <span className="flex items-center gap-1 text-primary font-bold text-base">
            ¥{order.reward}
          </span>
        </div>
        {showGrab && order.status === 'pending' && onGrab && (
          <Button
            size="sm"
            onClick={() => onGrab(order.id)}
            className="h-8 px-4 text-xs"
          >
            立即抢单
          </Button>
        )}
      </div>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default OrderCard;
