
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
        return <Clock className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">处理中</Badge>;
      case 'completed':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">已完成</Badge>;
      case 'error':
        return <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">错误</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">排队中</Badge>;
    }
  };

  if (processingItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-amber-600 font-medium">暂无处理任务</p>
        <p className="text-amber-500 text-sm mt-1">上传图片后将显示处理进度</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium mb-4 bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
        处理队列
      </h3>
      <div className="space-y-3">
        {processingItems.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-gradient-to-r from-white/80 to-amber-50/80 border border-white/50 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(item.status)}
                <span className="text-sm font-medium text-gray-800 truncate">{item.filename}</span>
              </div>
              {getStatusBadge(item.status)}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700 font-medium">{item.stage}</span>
                <span className="text-amber-600 font-semibold">{item.progress}%</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingQueue;
