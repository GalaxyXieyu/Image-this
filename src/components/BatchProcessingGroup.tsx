
import { Clock, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { BatchProcessingGroup as BatchGroup } from '@/types/processing';

interface BatchProcessingGroupProps {
  batch: BatchGroup;
}

const BatchProcessingGroup = ({ batch }: BatchProcessingGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">批量处理中</Badge>;
      case 'completed':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">批量完成</Badge>;
      case 'error':
        return <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">处理出错</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">等待处理</Badge>;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'workflow': return '一键处理';
      case 'background': return '换背景';
      case 'expand': return '扩图';
      case 'upscale': return '高清化';
      default: return '处理';
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-white/80 to-amber-50/80 border border-white/50 shadow-sm backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon(batch.status)}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">{batch.name}</span>
              <span className="text-xs text-gray-600">{getTypeText(batch.type)} · {batch.completedImages}/{batch.totalImages} 张</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(batch.status)}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-700 font-medium">总体进度</span>
            <span className="text-amber-600 font-semibold">{batch.overallProgress}%</span>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${batch.overallProgress}%` }}
            />
          </div>
        </div>

        <CollapsibleContent className="space-y-2">
          <div className="border-t border-amber-100 pt-3">
            <h4 className="text-xs font-medium text-amber-700 mb-2">详细任务</h4>
            <ScrollArea className={batch.tasks.length > 10 ? "h-64" : undefined}>
              <div className="space-y-2">
                {batch.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-white/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(task.status)}
                      <span className="text-xs text-gray-700 truncate max-w-32">{task.filename}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">{task.progress}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default BatchProcessingGroup;
