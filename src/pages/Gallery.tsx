
import { useState } from 'react';
import { FolderOpen, Image, Filter, Grid3X3, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Gallery = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data for processed images
  const processedImages = [
    {
      id: '1',
      originalName: 'product_001.jpg',
      processedAt: '2024-01-20 14:30',
      operations: ['背景替换', '扩图', '高清放大'],
      status: 'completed',
      thumbnail: '/placeholder.svg'
    },
    {
      id: '2',
      originalName: 'portrait_002.png',
      processedAt: '2024-01-20 13:15',
      operations: ['背景替换', '高清放大'],
      status: 'completed',
      thumbnail: '/placeholder.svg'
    }
  ];

  // Mock data for folders
  const folders = [
    { id: '1', name: '产品图片', count: 12, createdAt: '2024-01-20' },
    { id: '2', name: '人像照片', count: 8, createdAt: '2024-01-19' },
    { id: '3', name: '风景图片', count: 15, createdAt: '2024-01-18' }
  ];

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">图片管理</h1>
        <p className="text-muted-foreground">管理您的处理结果和图片分类</p>
      </div>

      <Tabs defaultValue="results" className="h-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-fit grid-cols-2 bg-muted/50">
            <TabsTrigger value="results" className="data-[state=active]:bg-background">
              处理结果
            </TabsTrigger>
            <TabsTrigger value="folders" className="data-[state=active]:bg-background">
              文件夹管理
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <TabsContent value="results" className="h-full mt-0">
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {processedImages.map((item) => (
              <Card key={item.id} className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="aspect-video rounded-lg bg-muted/30 mb-3 overflow-hidden">
                    <img 
                      src={item.thumbnail} 
                      alt={item.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium truncate">{item.originalName}</h3>
                    <p className="text-sm text-muted-foreground">{item.processedAt}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.operations.map((op, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {op}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="folders" className="h-full mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <Card key={folder.id} className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <span>{folder.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{folder.count} 张图片</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{folder.createdAt}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Gallery;
