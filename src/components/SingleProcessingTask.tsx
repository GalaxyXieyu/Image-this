
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SingleProcessingTask as SingleTask } from '@/types/processing';

interface SingleProcessingTaskProps {
  task: SingleTask;
}

const SingleProcessingTask = ({ task }: SingleProcessingTaskProps) => {
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

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-white/80 to-amber-50/80 border border-white/50 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon(task.status)}
          <span className="text-sm font-medium text-gray-800 truncate">{task.filename}</span>
        </div>
        {getStatusBadge(task.status)}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-700 font-medium">{task.stage}</span>
          <span className="text-amber-600 font-semibold">{task.progress}%</span>
        </div>
        <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SingleProcessingTask;
