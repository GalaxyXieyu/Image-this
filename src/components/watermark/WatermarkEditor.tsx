"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { Button } from '@/components/ui/button';
import { RotateCw, Download, Trash2, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import Konva from 'konva';

interface WatermarkEditorProps {
  imageUrl: string;
  logoUrl: string;
  onPositionChange: (position: { 
    x: number; 
    y: number; 
    width: number;
    height: number;
    editorWidth: number; 
    editorHeight: number 
  }) => void;
  width?: number;
  height?: number;
}

export default function WatermarkEditor({
  imageUrl,
  logoUrl,
  onPositionChange,
  width: containerWidth = 800,
  height: containerHeight = 600
}: WatermarkEditorProps) {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [selectedId, setSelectedId] = useState<string>('logo'); // 默认选中 logo
  const [canvasSize, setCanvasSize] = useState({ width: containerWidth, height: containerHeight });
  const [logoProps, setLogoProps] = useState({
    x: 50,
    y: 50,
    width: 150,
    height: 150,
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  });
  
  const logoRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // 加载背景图片并计算画布尺寸
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackgroundImage(img);
      
      // 计算适应容器的画布尺寸（保持原图比例）
      const imgAspect = img.width / img.height;
      const containerAspect = containerWidth / containerHeight;
      
      let canvasW, canvasH;
      if (imgAspect > containerAspect) {
        // 图片更宽，以宽度为准
        canvasW = containerWidth;
        canvasH = containerWidth / imgAspect;
      } else {
        // 图片更高，以高度为准
        canvasH = containerHeight;
        canvasW = containerHeight * imgAspect;
      }
      
      setCanvasSize({ width: canvasW, height: canvasH });
    };
    img.src = imageUrl;
  }, [imageUrl, containerWidth, containerHeight]);

  // 加载 Logo 图片并检查透明度
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLogoImage(img);
      
      // 检查图片是否有透明通道
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 检查是否有透明像素
        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
        
        if (!hasTransparency) {
          console.warn('⚠️ 上传的Logo没有透明背景！建议使用透明PNG格式的Logo。');
        } else {
          console.log('✅ Logo包含透明通道');
        }
      }
      
      // 设置初始 Logo 尺寸（保持宽高比）
      const aspectRatio = img.width / img.height;
      const initialWidth = Math.min(200, img.width);
      const initialHeight = initialWidth / aspectRatio;
      
      setLogoProps(prev => ({
        ...prev,
        x: (canvasSize.width - initialWidth) / 2,
        y: (canvasSize.height - initialHeight) / 2,
        width: initialWidth,
        height: initialHeight
      }));
    };
    img.src = logoUrl;
  }, [logoUrl, canvasSize.width, canvasSize.height]);

  // 更新 Transformer - 确保在 Logo 加载后绑定
  useEffect(() => {
    if (selectedId === 'logo' && transformerRef.current && logoRef.current && logoImage) {
      transformerRef.current.nodes([logoRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, logoImage]);

  // 通知父组件位置变化
  useEffect(() => {
    const actualWidth = logoProps.width * logoProps.scaleX;
    const actualHeight = logoProps.height * logoProps.scaleY;
    
    onPositionChange({
      x: logoProps.x,
      y: logoProps.y,
      width: actualWidth,
      height: actualHeight,
      editorWidth: canvasSize.width,
      editorHeight: canvasSize.height
    });
  }, [logoProps, canvasSize.width, canvasSize.height, onPositionChange]);

  const handleLogoTransform = () => {
    const node = logoRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    setLogoProps({
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
      rotation: node.rotation(),
      scaleX,
      scaleY
    });
  };

  const handleReset = () => {
    if (!logoImage) return;
    
    const aspectRatio = logoImage.width / logoImage.height;
    const initialWidth = Math.min(200, logoImage.width);
    const initialHeight = initialWidth / aspectRatio;
    
    setLogoProps({
      x: (canvasSize.width - initialWidth) / 2,
      y: (canvasSize.height - initialHeight) / 2,
      width: initialWidth,
      height: initialHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    });
  };

  const handleExport = () => {
    if (!stageRef.current) return;
    
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'watermarked-image.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">多图层编辑器</span>
          <span className="text-xs text-gray-500">
            ({Math.round(logoProps.x)}, {Math.round(logoProps.y)}) | 
            {Math.round(logoProps.width * logoProps.scaleX)} × {Math.round(logoProps.height * logoProps.scaleY)} | 
            {Math.round(logoProps.rotation)}°
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCw className="w-4 h-4 mr-1" />
            重置
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">💡 操作提示：</p>
          <ul className="text-xs space-y-1 text-blue-700">
            <li>• 点击 Logo 选中，拖拽可移动位置</li>
            <li>• 拖拽边角可调整大小（自动保持比例）</li>
            <li>• 拖拽旋转手柄可旋转 Logo</li>
            <li>• 双击 Logo 可重新选中</li>
            <li>• 切换图片时 Logo 位置保持不变</li>
          </ul>
        </div>
      </div>

      {/* Konva 画布 */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center" style={{ minHeight: containerHeight }}>
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          ref={stageRef}
          onMouseDown={(e) => {
            // 点击空白处不取消选择，保持 logo 选中状态
            const clickedOnEmpty = e.target === e.target.getStage();
            if (!clickedOnEmpty) {
              setSelectedId('logo');
            }
          }}
        >
          <Layer>
            {/* 背景图片层 */}
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                listening={false}
              />
            )}
            
            {/* Logo 图片层 */}
            {logoImage && (
              <>
                <KonvaImage
                  id="logo"
                  ref={logoRef}
                  image={logoImage}
                  {...logoProps}
                  draggable
                  onClick={() => setSelectedId('logo')}
                  onTap={() => setSelectedId('logo')}
                  onDragEnd={handleLogoTransform}
                  onTransformEnd={handleLogoTransform}
                />
                
                {/* Transformer - 用于调整大小和旋转 */}
                {selectedId === 'logo' && (
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      // 限制最小尺寸
                      if (newBox.width < 20 || newBox.height < 20) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                    enabledAnchors={[
                      'top-left',
                      'top-right',
                      'bottom-left',
                      'bottom-right'
                    ]}
                    rotateEnabled={true}
                    keepRatio={true}
                  />
                )}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* 图层列表 */}
      <div className="p-3 bg-white border rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">图层列表</div>
        <div className="space-y-1">
          <div 
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
              selectedId === 'logo' ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedId('logo')}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="text-sm">Logo 水印</span>
            </div>
            <span className="text-xs text-gray-500">可编辑</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-gray-50">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">背景图片</span>
            </div>
            <span className="text-xs text-gray-400">锁定</span>
          </div>
        </div>
      </div>
    </div>
  );
}
