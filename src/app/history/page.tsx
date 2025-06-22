'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/navigation/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  MoreHorizontal,
  Filter,
  Search,
  Calendar,
  Image as ImageIcon,
  Wand2,
  Expand,
  Zap,
  Trash2,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// 处理类型映射
const processTypeMap = {
  'BACKGROUND_REMOVAL': '背景替换',
  'IMAGE_EXPANSION': '图像扩展',
  'IMAGE_UPSCALING': '图像高清化',
  'ONE_CLICK_WORKFLOW': '一键增强',
  'GPT_GENERATION': '图像生成',
  'BACKGROUND_REPLACE': '背景替换',
  'OUTPAINT': '图像扩图',
  'UPSCALE': '图像高清化',
  'GENERATE': '图像生成',
  'ONE_CLICK': '一键增强'
};

// 状态映射
const statusMap = {
  'PENDING': 'pending',
  'PROCESSING': 'processing',
  'COMPLETED': 'completed',
  'FAILED': 'failed',
  'CANCELLED': 'cancelled'
};

// 状态显示名称
const statusDisplayMap = {
  'pending': '等待中',
  'processing': '处理中',
  'completed': '已完成',
  'failed': '失败',
  'cancelled': '已取消'
};


const typeIcons = {
  'one-click': Wand2,
  'background': ImageIcon,
  'expansion': Expand,
  'upscaling': Zap
};

const statusConfig = {
  completed: {
    label: '已完成',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  processing: {
    label: '处理中',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock,
    iconColor: 'text-blue-600'
  },
  failed: {
    label: '失败',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    iconColor: 'text-red-600'
  },
  pending: {
    label: '等待中',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
    iconColor: 'text-gray-600'
  }
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取处理记录数据
  const fetchImages = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const response = await fetch('/api/images');
      if (!response.ok) {
        throw new Error('获取处理记录失败');
      }
      const data = await response.json();
      if (data.success) {
        setImages(data.images);
      } else {
        throw new Error(data.error || '获取处理记录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取处理记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [session]);

  // 过滤处理记录
  const filteredImages = images.filter(item => {
    const typeName = processTypeMap[item.processType as keyof typeof processTypeMap] || item.processType;
    const status = statusMap[item.status as keyof typeof statusMap] || item.status.toLowerCase();

    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         typeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' ||
      item.processType === 'ONE_CLICK_WORKFLOW' && filterType === 'one-click' ||
      item.processType === 'BACKGROUND_REMOVAL' && filterType === 'background' ||
      item.processType === 'IMAGE_EXPANSION' && filterType === 'expansion' ||
      item.processType === 'IMAGE_UPSCALING' && filterType === 'upscaling';
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const openPreview = (imageSrc: string) => {
    setPreviewImage(imageSrc);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredImages.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredImages.map(item => item.id)));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const handleBatchDelete = () => {
    if (selectedTasks.size === 0) {
      alert('请先选择要删除的记录');
      return;
    }
    setTaskToDelete('batch');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (taskToDelete === 'batch') {
        // 批量删除
        const deletePromises = Array.from(selectedTasks).map(id =>
          fetch(`/api/images/${id}`, { method: 'DELETE' })
        );
        await Promise.all(deletePromises);
        setSelectedTasks(new Set());
      } else if (taskToDelete) {
        // 单个删除
        const response = await fetch(`/api/images/${taskToDelete}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('删除失败');
        }
      }

      // 重新获取数据
      await fetchImages();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
            处理记录
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            查看您的所有 AI 图像处理历史记录
          </p>
        </div>

        {/* 搜索和筛选 */}
        <div className="max-w-6xl mx-auto mb-8">
          <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="搜索处理记录..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:border-amber-400 focus:ring-amber-400 bg-white"
                  >
                    <option value="all">所有类型</option>
                    <option value="one-click">一键增强</option>
                    <option value="background">背景替换</option>
                    <option value="expansion">图像扩展</option>
                    <option value="upscaling">图像高清化</option>
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:border-amber-400 focus:ring-amber-400 bg-white"
                  >
                    <option value="all">所有状态</option>
                    <option value="completed">已完成</option>
                    <option value="processing">处理中</option>
                    <option value="failed">失败</option>
                  </select>
                </div>
              </div>

              {/* 批量操作 */}
              {selectedTasks.size > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-800">
                      已选择 {selectedTasks.size} 个记录
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTasks(new Set())}
                      >
                        取消选择
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchDelete}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        批量删除
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 处理记录列表 */}
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-lg">
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-6 animate-spin">
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">加载中...</h3>
                <p className="text-gray-600">正在获取处理记录</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-lg">
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">加载失败</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <Button onClick={fetchImages} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  重试
                </Button>
              </CardContent>
            </Card>
          ) : filteredImages.length === 0 ? (
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">暂无处理记录</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                    ? '没有找到符合条件的记录，请尝试调整搜索条件'
                    : '开始您的第一次 AI 图像处理吧！'}
                </p>
                {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
                  <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                    <a href="/workspace">开始处理</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-0">
                {/* 表格头部 */}
                <div className="border-b border-gray-200 bg-gray-50/80">
                  {/* 统计和批量操作行 */}
                  <div className="px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.size === filteredImages.length && filteredImages.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          共 {filteredImages.length} 条记录
                          {selectedTasks.size > 0 && ` (已选择 ${selectedTasks.size} 条)`}
                        </span>
                      </div>
                      {selectedTasks.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBatchDelete}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          批量删除
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 表格列头 */}
                  <div className="px-6 py-2 hidden md:block">
                    <div className="flex items-center space-x-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="w-4"></div> {/* 选择框占位 */}
                      <div className="w-24">预览</div>
                      <div className="flex-1 min-w-0">处理信息</div>
                      <div className="w-32">文件信息</div>
                      <div className="w-24">操作</div>
                    </div>
                  </div>
                </div>

                {/* 表格内容 */}
                <div className="divide-y divide-gray-100">

                  {filteredImages.map((item) => {
                    const typeName = processTypeMap[item.processType as keyof typeof processTypeMap] || item.processType;
                    const status = statusMap[item.status as keyof typeof statusMap] || item.status.toLowerCase();
                    const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    const TypeIcon = ImageIcon;

                    return (
                      <div key={item.id} className="px-4 md:px-6 py-3 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-b-0">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          {/* 选择框 */}
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(item.id)}
                            onChange={() => handleSelectTask(item.id)}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 flex-shrink-0"
                          />

                          {/* 缩略图区域 */}
                          <div className="w-16 md:w-24 flex space-x-1 flex-shrink-0">
                            {item.originalUrl && (
                              <div
                                className="w-10 h-10 bg-gray-100 rounded border border-gray-200 overflow-hidden cursor-pointer hover:border-gray-300 transition-colors relative group"
                                onClick={() => setPreviewImage(item.originalUrl)}
                                title="查看原图"
                              >
                                <img
                                  src={item.originalUrl}
                                  alt="原图"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center">
                                        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                        </svg>
                                      </div>
                                    `;
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                  <Eye className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            )}
                            {item.processedUrl && (
                              <div
                                className="w-10 h-10 bg-gray-100 rounded border border-green-200 overflow-hidden cursor-pointer hover:border-green-300 transition-colors relative group"
                                onClick={() => setPreviewImage(item.processedUrl)}
                                title="查看处理结果"
                              >
                                <img
                                  src={item.processedUrl}
                                  alt="处理后"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center">
                                        <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                        </svg>
                                      </div>
                                    `;
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                  <Eye className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 处理信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-4 h-4 md:w-5 md:h-5 rounded bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                <TypeIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate">{typeName}</span>
                              <Badge className={`text-xs px-1.5 md:px-2 py-0.5 ${statusInfo.color}`}>
                                <StatusIcon className={`w-2.5 h-2.5 md:w-3 md:h-3 mr-1 ${statusInfo.iconColor}`} />
                                <span className="hidden sm:inline">{statusDisplayMap[status as keyof typeof statusDisplayMap] || status}</span>
                                <span className="sm:hidden">{status === 'completed' ? '✓' : status === 'failed' ? '✗' : '⋯'}</span>
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              <div className="flex items-center space-x-3">
                                <span className="inline-flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  <span className="sm:hidden">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </span>
                                <span className="inline-flex items-center md:hidden">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  <span className="truncate max-w-[120px]">{item.filename}</span>
                                </span>
                              </div>
                            </div>
                            {item.errorMessage && (
                              <div className="text-red-500 text-xs mt-1 truncate">
                                {item.errorMessage}
                              </div>
                            )}
                          </div>

                          {/* 文件信息 */}
                          <div className="w-32 flex-shrink-0 hidden md:block">
                            <div className="text-xs text-gray-500">
                              <div className="flex items-center mb-1">
                                <ImageIcon className="w-3 h-3 mr-1" />
                                <span className="truncate">{item.filename}</span>
                              </div>
                              {item.fileSize && (
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {(item.fileSize / 1024 / 1024).toFixed(1)}MB
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="w-24 flex items-center justify-end space-x-1 flex-shrink-0">
                            {item.status === 'COMPLETED' && item.processedUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(item.processedUrl, '_blank')}
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="下载结果"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(item.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="删除记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={closePreview}>
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={closePreview}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 z-10"
            >
              ×
            </button>
            <div className="bg-white rounded-lg p-4">
              <div className="max-w-4xl max-h-[80vh] bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                <img
                  src={previewImage}
                  alt="图片预览"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<span class="text-gray-500">图片加载失败</span>`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                确认删除
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              {taskToDelete === 'batch'
                ? `确定要删除选中的 ${selectedTasks.size} 个处理记录吗？`
                : '确定要删除这个处理记录吗？'
              }
              <br />
              <span className="text-red-600 text-sm">此操作无法撤销。</span>
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
              >
                取消
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
