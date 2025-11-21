import { useState, useRef } from 'react';
import { ActiveTab } from '@/components/workspace/WorkspaceSidebar';

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
}

export interface ProcessedResult {
  id: string;
  originalImageId: string;
  originalName: string;
  processedImageUrl: string;
  processType: string;
  timestamp: string;
  parameters?: Record<string, unknown>;
}

export interface Task {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStep: string;
  createdAt: string;
  originalImageId?: string;
  originalName?: string;
  outputData?: string;
  errorMessage?: string;
}

export function useWorkspaceState() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("one-click");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [referenceImage, setReferenceImage] = useState<UploadedImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);

  // 水印相关状态
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('Sample Watermark');
  const [watermarkOpacity, setWatermarkOpacity] = useState(1.0);
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkType, setWatermarkType] = useState<'text' | 'logo'>('logo');
  const [watermarkLogo, setWatermarkLogo] = useState<UploadedImage | null>(null);
  const [showWatermarkPreview, setShowWatermarkPreview] = useState(false);
  const [watermarkSettings, setWatermarkSettings] = useState({ 
    x: 50, 
    y: 50, 
    width: 150, 
    height: 150, 
    editorWidth: 600, 
    editorHeight: 400 
  });

  // 输出分辨率
  const [outputResolution, setOutputResolution] = useState('original');

  // 任务管理状态
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  
  // Refs
  const watermarkLogoInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTasksRef = useRef<Task[]>([]);
  const processedResultsRef = useRef<ProcessedResult[]>([]);
  const uploadedImagesRef = useRef<UploadedImage[]>([]);
  const referenceImageRef = useRef<UploadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  return {
    // 状态
    activeTab,
    setActiveTab,
    isProcessing,
    setIsProcessing,
    uploadedImages,
    setUploadedImages,
    referenceImage,
    setReferenceImage,
    showImageModal,
    setShowImageModal,
    selectedPreviewIndex,
    setSelectedPreviewIndex,
    processedResults,
    setProcessedResults,
    showResultModal,
    setShowResultModal,
    selectedResultIndex,
    setSelectedResultIndex,
    
    // 水印状态
    enableWatermark,
    setEnableWatermark,
    watermarkText,
    setWatermarkText,
    watermarkOpacity,
    setWatermarkOpacity,
    watermarkPosition,
    setWatermarkPosition,
    watermarkType,
    setWatermarkType,
    watermarkLogo,
    setWatermarkLogo,
    showWatermarkPreview,
    setShowWatermarkPreview,
    watermarkSettings,
    setWatermarkSettings,
    
    // 其他状态
    outputResolution,
    setOutputResolution,
    activeTasks,
    setActiveTasks,
    
    // Refs
    watermarkLogoInputRef,
    pollingIntervalRef,
    activeTasksRef,
    processedResultsRef,
    uploadedImagesRef,
    referenceImageRef,
    fileInputRef,
    folderInputRef,
    referenceInputRef,
  };
}
