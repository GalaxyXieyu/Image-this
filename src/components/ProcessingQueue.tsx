
import { Clock } from 'lucide-react';
import { ProcessingItem, BatchProcessingGroup as BatchGroup, SingleProcessingTask as SingleTask } from '@/types/processing';
import BatchProcessingGroup from './BatchProcessingGroup';
import SingleProcessingTask from './SingleProcessingTask';

const ProcessingQueue = () => {
  // Mock processing queue data with both batch and single tasks
  const processingItems: ProcessingItem[] = [
    {
      id: 'batch-1',
      name: '产品图片批量处理',
      type: 'workflow',
      totalImages: 5,
      completedImages: 2,
      status: 'processing',
      overallProgress: 40,
      createdAt: new Date(),
      tasks: [
        {
          id: 'task-1',
          filename: 'product_001.jpg',
          status: 'completed',
          progress: 100,
          stage: '处理完成'
        },
        {
          id: 'task-2',
          filename: 'product_002.jpg',
          status: 'completed',
          progress: 100,
          stage: '处理完成'
        },
        {
          id: 'task-3',
          filename: 'product_003.jpg',
          status: 'processing',
          progress: 65,
          stage: '背景替换中...'
        },
        {
          id: 'task-4',
          filename: 'product_004.jpg',
          status: 'queued',
          progress: 0,
          stage: '等待处理'
        },
        {
          id: 'task-5',
          filename: 'product_005.jpg',
          status: 'queued',
          progress: 0,
          stage: '等待处理'
        }
      ]
    },
    {
      id: 'single-1',
      type: 'single',
      filename: 'portrait_single.png',
      status: 'processing',
      progress: 30,
      stage: '智能扩图中...'
    },
    {
      id: 'batch-2',
      name: '头像高清化处理',
      type: 'upscale',
      totalImages: 3,
      completedImages: 3,
      status: 'completed',
      overallProgress: 100,
      createdAt: new Date(),
      tasks: [
        {
          id: 'task-6',
          filename: 'avatar_001.jpg',
          status: 'completed',
          progress: 100,
          stage: '处理完成'
        },
        {
          id: 'task-7',
          filename: 'avatar_002.jpg',
          status: 'completed',
          progress: 100,
          stage: '处理完成'
        },
        {
          id: 'task-8',
          filename: 'avatar_003.jpg',
          status: 'completed',
          progress: 100,
          stage: '处理完成'
        }
      ]
    }
  ];

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

  const isBatchGroup = (item: ProcessingItem): item is BatchGroup => {
    return 'tasks' in item && 'totalImages' in item;
  };

  return (
    <div>
      <h3 className="font-medium mb-4 bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
        处理队列
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {processingItems.map((item) => (
          isBatchGroup(item) ? (
            <BatchProcessingGroup key={item.id} batch={item} />
          ) : (
            <SingleProcessingTask key={item.id} task={item as SingleTask} />
          )
        ))}
      </div>
    </div>
  );
};

export default ProcessingQueue;
