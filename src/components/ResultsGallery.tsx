
import { Download, Eye, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ResultsGallery = () => {
  // Mock results data
  const results = [
    {
      id: '1',
      original: '/api/placeholder/400/300',
      processed: '/api/placeholder/400/300',
      filename: 'product_001_enhanced.jpg',
      operations: ['背景替换', '扩图', '高清放大'],
      timestamp: '2024-01-20 14:30',
      fileSize: '2.4 MB'
    },
    {
      id: '2', 
      original: '/api/placeholder/400/300',
      processed: '/api/placeholder/400/300',
      filename: 'portrait_002_enhanced.png',
      operations: ['背景替换', '高清放大'],
      timestamp: '2024-01-20 14:25',
      fileSize: '3.1 MB'
    }
  ];

  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">暂无处理结果</p>
          <p className="text-sm">处理完成后的图片将在这里显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">处理结果</h3>
        <Button variant="outline" size="sm">
          批量下载
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((result) => (
          <div key={result.id} className="group border border-border/30 rounded-xl overflow-hidden bg-card/50 hover-lift">
            {/* Image Preview */}
            <div className="aspect-[4/3] bg-muted/20 relative overflow-hidden">
              <img 
                src={result.processed} 
                alt={result.filename}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h4 className="font-medium text-foreground truncate">{result.filename}</h4>
                <p className="text-xs text-muted-foreground">{result.timestamp} • {result.fileSize}</p>
              </div>

              {/* Operations */}
              <div className="flex flex-wrap gap-1">
                {result.operations.map((op, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {op}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex space-x-1">
                  <Button size="sm" variant="ghost" className="h-8 px-2">
                    <Eye className="w-3 h-3 mr-1" />
                    预览
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2">
                    <Download className="w-3 h-3 mr-1" />
                    下载
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;
