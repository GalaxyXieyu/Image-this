
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Eye, FolderPlus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Gallery = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // 示例处理结果数据
  const processedImages = [
    {
      id: 1,
      originalName: 'portrait.jpg',
      processedUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=400&fit=crop',
      originalUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=200&fit=crop',
      processType: '背景替换',
      status: 'completed',
      createdAt: '2024-12-20 14:30',
      size: '2.3MB'
    },
    {
      id: 2,
      originalName: 'landscape.jpg',
      processedUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=400&fit=crop',
      originalUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=150&h=200&fit=crop',
      processType: '扩图+高清',
      status: 'completed',
      createdAt: '2024-12-20 13:15',
      size: '4.1MB'
    },
    {
      id: 3,
      originalName: 'tech.jpg',
      processedUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=400&fit=crop',
      originalUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=200&fit=crop',
      processType: '一键增强',
      status: 'processing',
      createdAt: '2024-12-20 15:45',
      size: '1.8MB'
    },
    {
      id: 4,
      originalName: 'code.jpg',
      processedUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=400&fit=crop',
      originalUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=200&fit=crop',
      processType: '背景模糊',
      status: 'completed',
      createdAt: '2024-12-20 12:00',
      size: '3.5MB'
    }
  ];

  // 示例文件夹数据
  const folders = [
    { id: 1, name: '人像处理', count: 15, color: 'from-amber-500 to-orange-500' },
    { id: 2, name: '产品图片', count: 8, color: 'from-orange-500 to-red-500' },
    { id: 3, name: '风景照片', count: 23, color: 'from-red-500 to-pink-500' },
    { id: 4, name: '技术截图', count: 12, color: 'from-pink-500 to-purple-500' }
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  图片管理
                </h1>
                <p className="text-sm text-muted-foreground">管理您的处理结果和文件夹</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="搜索图片..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-white/90"
                />
              </div>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <FolderPlus className="w-4 h-4 mr-2" />
                新建文件夹
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Tabs defaultValue="results" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="results" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              处理结果
            </TabsTrigger>
            <TabsTrigger value="folders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              文件夹管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="h-[calc(100%-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedImages.map((image) => (
                <Card key={image.id} className="overflow-hidden bg-white/90 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img 
                      src={image.processedUrl} 
                      alt={image.originalName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className={`${
                        image.status === 'completed' ? 'bg-green-500' : 
                        image.status === 'processing' ? 'bg-amber-500' : 'bg-red-500'
                      } text-white border-0`}>
                        {image.status === 'completed' ? '已完成' : 
                         image.status === 'processing' ? '处理中' : '失败'}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium truncate">{image.originalName}</CardTitle>
                    <CardDescription className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>{image.processType}</span>
                        <span>{image.size}</span>
                      </div>
                      <div className="text-muted-foreground">{image.createdAt}</div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        预览
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        下载
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="folders" className="h-[calc(100%-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {folders.map((folder) => (
                <Card key={folder.id} className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${folder.color} flex items-center justify-center shadow-lg`}>
                        <span className="text-white text-2xl">📁</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{folder.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{folder.count} 张图片</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        打开文件夹
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Gallery;
