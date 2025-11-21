# 图库"一键增强"分类显示问题修复

## 问题描述

用户反馈在图库页面中，"一键增强"功能处理完成的图片无法正确显示和统计。

## 问题根源

### 1. 分类 ID 与数据库 processType 不匹配

在 `gallery/page.tsx` 中定义的分类 ID 与实际数据库中的 `processType` 字段值不一致：

**修复前：**
```typescript
{ id: 'IMAGE_ENHANCEMENT', label: '画质增强' }      // ❌ 数据库中是 IMAGE_UPSCALING
{ id: 'BACKGROUND_REPLACE', label: '背景替换' }     // ❌ 数据库中是 BACKGROUND_REMOVAL
```

**修复后：**
```typescript
{ id: 'IMAGE_ENHANCEMENT', label: '画质增强' }      // ✅ 保留（火山引擎增强）
{ id: 'IMAGE_UPSCALING', label: '图像高清化' }      // ✅ 新增（对应数据库）
{ id: 'BACKGROUND_REMOVAL', label: '背景替换' }     // ✅ 修正
{ id: 'WATERMARK', label: '叠加水印' }              // ✅ 新增
```

### 2. 分类统计逻辑不准确

**修复前：**
```typescript
const count = category.id === 'all' 
  ? images.length 
  : images.filter(img => img.processType === category.id).length;
```

问题：
- 使用前端已加载的 `images` 数组统计
- 当切换分类时，`images` 数组会被过滤，导致统计不准确
- 无法显示其他分类的真实数量

**修复后：**
```typescript
// 1. 新增状态存储统计数据
const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

// 2. 从服务端获取完整统计
const loadCategoryStats = async () => {
  const response = await fetch('/api/images?status=COMPLETED&limit=1000');
  const allImages = data.images || [];
  
  const stats: Record<string, number> = { all: allImages.length };
  allImages.forEach((img: ProcessedImage) => {
    stats[img.processType] = (stats[img.processType] || 0) + 1;
  });
  
  setCategoryStats(stats);
};

// 3. 使用统计数据显示
const count = categoryStats[category.id] || 0;
```

## 修复内容

### 文件：`src/app/gallery/page.tsx`

#### 1. 新增分类统计状态
```typescript
const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
```

#### 2. 新增统计数据加载函数
```typescript
const loadCategoryStats = async () => {
  // 获取所有已完成的图片
  const response = await fetch('/api/images?status=COMPLETED&limit=1000');
  const allImages = data.images || [];
  
  // 统计各分类数量
  const stats: Record<string, number> = { all: allImages.length };
  allImages.forEach((img: ProcessedImage) => {
    stats[img.processType] = (stats[img.processType] || 0) + 1;
  });
  
  setCategoryStats(stats);
};
```

#### 3. 在组件加载和分类切换时更新统计
```typescript
useEffect(() => {
  if (session?.user && !loadingRef.current) {
    loadProjects();
    loadCategoryStats();  // ✅ 新增
    loadImages(true);
  }
}, [session]);

useEffect(() => {
  if (session?.user && !loadingRef.current) {
    setPage(1);
    setImages([]);
    loadImages(true);
    loadCategoryStats();  // ✅ 新增
  }
}, [selectedCategory, selectedProject]);
```

#### 4. 修正分类定义
```typescript
{[
  { id: 'all', label: '全部图片', icon: Image },
  { id: 'ONE_CLICK_WORKFLOW', label: '一键增强', icon: Zap },
  { id: 'IMAGE_ENHANCEMENT', label: '画质增强', icon: Sparkles },
  { id: 'IMAGE_OUTPAINTING', label: '智能扩图', icon: Maximize2 },
  { id: 'IMAGE_UPSCALING', label: '图像高清化', icon: Sparkles },      // ✅ 新增
  { id: 'BACKGROUND_REMOVAL', label: '背景替换', icon: RefreshCw },    // ✅ 修正
  { id: 'WATERMARK', label: '叠加水印', icon: Wand2 },                 // ✅ 新增
  { id: 'IMAGE_GENERATION', label: '图片生成', icon: Wand2 },
].map(category => {
  const Icon = category.icon;
  const count = categoryStats[category.id] || 0;  // ✅ 使用统计数据
  // ...
})}
```

#### 5. 完善类型标签映射
```typescript
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'ONE_CLICK_WORKFLOW': return '一键增强';
    case 'BACKGROUND_REMOVAL': return '背景替换';
    case 'IMAGE_OUTPAINTING': return '智能扩图';
    case 'IMAGE_UPSCALING': return '高清化';
    case 'IMAGE_ENHANCEMENT': return '画质增强';
    case 'WATERMARK': return '叠加水印';
    case 'IMAGE_GENERATION': return '图片生成';
    default: return type;
  }
};
```

## 数据库 processType 字段值说明

根据代码分析，系统中使用的 `processType` 值包括：

| processType 值 | 说明 | 对应功能 |
|---------------|------|---------|
| `ONE_CLICK_WORKFLOW` | 一键增强 | 背景替换 + 扩图 + 画质增强的组合工作流 |
| `BACKGROUND_REMOVAL` | 背景替换 | 使用即梦 AI 进行背景替换 |
| `IMAGE_OUTPAINTING` | 智能扩图 | 使用通义千问进行图像扩展 |
| `IMAGE_UPSCALING` | 图像高清化 | 使用火山引擎进行超分辨率 |
| `IMAGE_ENHANCEMENT` | 画质增强 | 使用火山引擎进行画质增强 |
| `WATERMARK` | 叠加水印 | 添加文字或 Logo 水印 |
| `IMAGE_GENERATION` | 图片生成 | AI 图片生成功能 |

## 验证步骤

1. **刷新图库页面**
   - 访问 http://localhost:23000/gallery
   - 检查左侧分类列表中"一键增强"的数量是否正确显示

2. **点击"一键增强"分类**
   - 应该能看到所有 `processType` 为 `ONE_CLICK_WORKFLOW` 的图片
   - 图片卡片上应该显示"一键增强"标签

3. **验证其他分类**
   - 点击"背景替换"、"智能扩图"等分类
   - 确认每个分类都能正确显示对应的图片

4. **检查统计数量**
   - 各分类的数量应该与实际图片数量一致
   - 切换分类时，数量不应该变化

## 预期效果

修复后，用户应该能够：

1. ✅ 在图库侧边栏看到"一键增强"分类及其正确的图片数量
2. ✅ 点击"一键增强"分类后，看到所有一键增强处理完成的图片
3. ✅ 图片卡片上正确显示"一键增强"标签
4. ✅ 所有分类的统计数量都准确无误
5. ✅ 新增的"图像高清化"和"叠加水印"分类也能正常工作

## 技术要点

### 1. 前端状态管理
- 使用独立的 `categoryStats` 状态存储统计数据
- 避免依赖已过滤的 `images` 数组进行统计

### 2. 数据获取策略
- 统计数据通过单独的 API 调用获取（limit=1000）
- 图片列表使用分页加载（limit=20）
- 在组件挂载和分类切换时更新统计

### 3. 类型映射一致性
- 前端分类 ID 必须与数据库 `processType` 字段值完全一致
- 使用 `getTypeLabel` 函数统一处理类型显示名称

## 注意事项

1. **性能考虑**
   - 统计数据使用 `limit=1000` 可能在图片数量很大时影响性能
   - 后续可考虑在后端实现聚合统计 API

2. **缓存策略**
   - 当前每次切换分类都会重新获取统计数据
   - 可考虑添加缓存机制减少 API 调用

3. **扩展性**
   - 新增处理类型时，需要同时更新：
     - 分类定义数组
     - `getTypeLabel` 函数
     - 确保数据库中使用相同的 `processType` 值

## 相关文件

- `src/app/gallery/page.tsx` - 图库主页面（已修复）
- `src/app/api/images/route.ts` - 图片查询 API
- `src/app/api/workflow/one-click/service.ts` - 一键增强服务
- `prisma/schema.prisma` - 数据库 Schema

## 修复时间

2025-11-21 23:13 UTC+08:00
