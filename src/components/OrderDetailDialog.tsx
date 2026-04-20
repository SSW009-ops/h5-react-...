import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Order } from '@/components/OrderCard';

interface OrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGrab?: (id: string) => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCancel?: (id: string) => void;
  canGrab?: boolean;
  isCreator?: boolean;
  isRunner?: boolean;
}

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

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '待接单', className: 'bg-warning/10 text-warning' },
  in_progress: { label: '进行中', className: 'bg-primary/10 text-primary' },
  completed: { label: '已完成', className: 'bg-success/10 text-success' },
  cancelled: { label: '已取消', className: 'bg-destructive/10 text-destructive' },
};

const OrderDetailDialog = ({ order, open, onOpenChange, onGrab, onComplete, onDelete, onCancel, canGrab, isCreator, isRunner }: OrderDetailDialogProps) => {
  if (!order) return null;
  const status = statusMap[order.status] || statusMap.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base text-foreground pr-6">{order.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block ${status.className}`}>
            {status.label}
          </span>

          <div>
            <p className="text-xs text-muted-foreground mb-1">订单描述</p>
            <p className="text-sm text-foreground leading-relaxed">{order.description}</p>
          </div>

          {order.contact && (canGrab ? order.status !== 'pending' : true) && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">顾客联系方式</p>
              <p className="text-sm text-foreground font-medium">{order.contact}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {getTimeAgo(order.created_at)}
            </div>
            <span className="text-primary font-bold text-xl">¥{order.reward}</span>
          </div>

          {/* Grab button for pending orders */}
          {order.status === 'pending' && canGrab && onGrab && (
            <Button
              className="w-full"
              onClick={() => {
                onGrab(order.id);
                onOpenChange(false);
              }}
            >
              立即抢单
            </Button>
          )}

          {/* Complete button: runner on in_progress, or creator on active orders */}
          {onComplete && ((order.status === 'in_progress' && (isRunner || isCreator)) || (order.status === 'pending' && isCreator)) && (
            <Button
              className="w-full"
              onClick={() => {
                onComplete(order.id);
                onOpenChange(false);
              }}
            >
              确认完成
            </Button>
          )}

          {/* Creator actions */}
          {isCreator && order.status === 'pending' && onDelete && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                onDelete(order.id);
                onOpenChange(false);
              }}
            >
              删除订单
            </Button>
          )}

          {isCreator && order.status === 'in_progress' && onCancel && (
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => {
                onCancel(order.id);
                onOpenChange(false);
              }}
            >
              取消订单
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
