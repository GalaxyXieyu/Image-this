"use client";

import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { RotateCw, Maximize2, Info } from 'lucide-react';

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
  width = 600,
  height = 400
}: WatermarkEditorProps) {
  const [logoSize, setLogoSize] = useState({ width: 100, height: 100 });
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 100, height: 100 });

  // 加载 Logo 并获取实际尺寸
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const initialWidth = Math.min(150, img.width);
      const initialHeight = initialWidth / aspectRatio;
      
      setLogoSize({ width: img.width, height: img.height });
      setSize({ width: initialWidth, height: initialHeight });
      setPosition({ 
        x: (width - initialWidth) / 2, 
        y: (height - initialHeight) / 2 
      });
    };
    img.src = logoUrl;
  }, [logoUrl, width, height]);

  // 通知父组件位置变化
  useEffect(() => {
    onPositionChange({ 
      x: position.x, 
      y: position.y, 
      width: size.width,
      height: size.height,
      editorWidth: width,
      editorHeight: height
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y, size.width, size.height, width, height]);

  const handleReset = () => {
    const aspectRatio = logoSize.width / logoSize.height;
    const initialWidth = Math.min(150, logoSize.width);
    const initialHeight = initialWidth / aspectRatio;
    
    setSize({ width: initialWidth, height: initialHeight });
    setPosition({ 
      x: (width - initialWidth) / 2, 
      y: (height - initialHeight) / 2 
    });
  };

  const scale = size.width / logoSize.width;

  return (
    <div className="space-y-4">
      {/* 提示信息 */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">操作提示：</p>
          <ul className="text-xs space-y-1 text-blue-700">
            <li>• 拖拽 Logo 可移动位置</li>
            <li>• 拖拽边角可调整大小（保持比例）</li>
            <li>• 拖拽边缘可自由调整宽高</li>
          </ul>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4" />
            <span>缩放: {(scale * 100).toFixed(0)}%</span>
          </div>
          <div className="text-gray-400">|</div>
          <span>位置: ({Math.round(position.x)}, {Math.round(position.y)})</span>
          <div className="text-gray-400">|</div>
          <span>尺寸: {Math.round(size.width)} × {Math.round(size.height)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCw className="w-4 h-4 mr-2" />
          重置
        </Button>
      </div>

      {/* 编辑画布 */}
      <div 
        className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 shadow-inner"
        style={{ width, height }}
      >
        {/* 背景图片 */}
        <img
          src={imageUrl}
          alt="Background"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        
        {/* 可拖拽调整的 Logo */}
        <Rnd
          size={{ width: size.width, height: size.height }}
          position={{ x: position.x, y: position.y }}
          onDragStop={(e, d) => {
            setPosition({ x: d.x, y: d.y });
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            setSize({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
            });
            setPosition(position);
          }}
          bounds="parent"
          lockAspectRatio={false}
          className="border-2 border-blue-500 shadow-lg"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          resizeHandleStyles={{
            topLeft: { 
              width: '12px', 
              height: '12px', 
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              left: '-6px',
              top: '-6px'
            },
            topRight: { 
              width: '12px', 
              height: '12px', 
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              right: '-6px',
              top: '-6px'
            },
            bottomLeft: { 
              width: '12px', 
              height: '12px', 
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              left: '-6px',
              bottom: '-6px'
            },
            bottomRight: { 
              width: '12px', 
              height: '12px', 
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              right: '-6px',
              bottom: '-6px'
            },
            top: {
              width: '100%',
              height: '8px',
              top: '-4px',
              cursor: 'ns-resize'
            },
            right: {
              width: '8px',
              height: '100%',
              right: '-4px',
              cursor: 'ew-resize'
            },
            bottom: {
              width: '100%',
              height: '8px',
              bottom: '-4px',
              cursor: 'ns-resize'
            },
            left: {
              width: '8px',
              height: '100%',
              left: '-4px',
              cursor: 'ew-resize'
            }
          }}
        >
          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        </Rnd>

        {/* 辅助网格线（可选） */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 中心十字线 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-300 opacity-30" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-300 opacity-30" />
        </div>
      </div>

      {/* 使用说明 */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
        <p className="font-medium text-gray-700 mb-1">💡 专业提示：</p>
        <ul className="space-y-1">
          <li>• 按住 Shift 拖拽边角可保持宽高比</li>
          <li>• Logo 会自动限制在画布范围内</li>
          <li>• 蓝色边框和控制点表示当前选中状态</li>
        </ul>
      </div>
    </div>
  );
}
