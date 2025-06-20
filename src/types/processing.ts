
export interface ProcessingTask {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  stage: string;
}

export interface BatchProcessingGroup {
  id: string;
  name: string;
  type: 'workflow' | 'background' | 'expand' | 'upscale';
  totalImages: number;
  completedImages: number;
  status: 'queued' | 'processing' | 'completed' | 'error';
  overallProgress: number;
  tasks: ProcessingTask[];
  createdAt: Date;
}

export interface SingleProcessingTask extends ProcessingTask {
  type: 'single';
}

export type ProcessingItem = BatchProcessingGroup | SingleProcessingTask;
