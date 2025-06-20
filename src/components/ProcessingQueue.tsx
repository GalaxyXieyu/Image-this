
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const ProcessingQueue = () => {
  // Mock processing queue data
  const processingItems = [
    {
      id: '1',
      filename: 'product_001.jpg',
      status: 'processing',
      progress: 65,
      stage: '背景替换中...'
    },
    {
      id: '2',
      filename: 'portrait_002.png',
      status: 'completed',
      progress: 100,
      stage: '处理完成'
    },
    {
      id: '3',
      filename: 'landscape_003.jpg',
      status: 'queued',
      progress: 0,
      stage: '等待处理'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="default" className="bg-primary/10 text-primary">处理中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-700">已完成</Badge>;
      case 'error':
        return <Badge variant="destructive">错误</Badge>;
      default:
        return <Badge variant="secondary">排队中</Badge>;
    }
  };

  if (processingItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border/50">
      <h3 className="font-medium text-foreground mb-4">处理队列</h3>
      <div className="space-y-3">
        {processingItems.map((item) => (
          <div key={item.id} className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(item.status)}
                <span className="text-sm font-medium truncate">{item.filename}</span>
              </div>
              {getStatusBadge(item.status)}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.stage}</span>
                <span>{item.progress}%</span>
              </div>
              <Progress value={item.progress} className="h-1.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingQueue;
