"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect } from 'react-konva';
import Konva from 'konva';

interface WatermarkEditorProps {
  imageUrl: string;
  logoUrl?: string; // 可选
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
  // 扩图比例（用于一键增强预览）
  xScale?: number;
  yScale?: number;
}

export default function WatermarkEditor({
  imageUrl,
  logoUrl,
  onPositionChange,
  width: containerWidth = 800,
  height: containerHeight = 600,
  xScale = 1,
  yScale = 1
}: WatermarkEditorProps) {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [selectedId, setSelectedId] = useState<string>('logo'); // 默认选中 logo
  const [canvasSize, setCanvasSize] = useState({ width: containerWidth, height: containerHeight });
  // 原图在画布中的位置和尺寸（用于扩图预览）
  const [imageRect, setImageRect] = useState({ x: 0, y: 0, width: containerWidth, height: containerHeight });
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

  // 加载背景图片并计算画布尺寸（考虑扩图比例）
  useEffect(() => {
    if (!imageUrl) {
      setBackgroundImage(null);
      setCanvasSize({ width: containerWidth, height: containerHeight });
      setImageRect({ x: 0, y: 0, width: containerWidth, height: containerHeight });
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // === 背景图片加载完成
      setBackgroundImage(img);
      
      // === 计算画布尺寸
      const expandedWidth = img.width * xScale;
      const expandedHeight = img.height * yScale;
      const expandedAspect = expandedWidth / expandedHeight;
      const containerAspect = containerWidth / containerHeight;
      
      let canvasW, canvasH;
      if (expandedAspect > containerAspect) {
        canvasW = containerWidth;
        canvasH = containerWidth / expandedAspect;
      } else {
        canvasH = containerHeight;
        canvasW = containerHeight * expandedAspect;
      }
      setCanvasSize({ width: canvasW, height: canvasH });
      
      // === 计算原图在扩图后画布中的位置和尺寸（居中放置）
      const imgW = canvasW / xScale;
      const imgH = canvasH / yScale;
      const imgX = (canvasW - imgW) / 2;
      const imgY = (canvasH - imgH) / 2;
      setImageRect({ x: imgX, y: imgY, width: imgW, height: imgH });
    };
    img.src = imageUrl;
  }, [imageUrl, containerWidth, containerHeight, xScale, yScale]);

  // 加载 Logo 图片（可选）并检查透明度
  useEffect(() => {
    // === 清除旧的 Logo 图片
    setLogoImage(null);
    
    if (!logoUrl) {
      return;
    }
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => {
      console.error('[WatermarkEditor] Logo 图片加载失败');
      setLogoImage(null);
    };
    img.onload = () => {
      setLogoImage(img);
      // === 初始 Logo 尺寸（保持宽高比）
      const aspectRatio = img.width / img.height;
      const initialWidth = Math.min(200, img.width);
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
    img.src = logoUrl;
    
    // === 清理函数：如果组件卸载或 logoUrl 改变，取消图片加载
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }, [logoUrl, canvasSize.width, canvasSize.height]);

  // 更新 Transformer - 确保在 Logo 加载后绑定
  useEffect(() => {
    if (selectedId === 'logo' && transformerRef.current && logoRef.current && logoImage) {
      transformerRef.current.nodes([logoRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, logoImage]);

  // 通知父组件位置变化（仅在有 Logo 时）
  useEffect(() => {
    if (!logoImage) return;
    const actualWidth = logoProps.width * logoProps.scaleX;
    const actualHeight = logoProps.height * logoProps.scaleY;
    const position = {
      x: logoProps.x,
      y: logoProps.y,
      width: actualWidth,
      height: actualHeight,
      editorWidth: canvasSize.width,
      editorHeight: canvasSize.height
    };
    // === 调试日志
    console.log('[WatermarkEditor] 位置变化:', {
      logoPosition: { x: logoProps.x, y: logoProps.y },
      logoSize: { width: actualWidth, height: actualHeight },
      editorSize: { width: canvasSize.width, height: canvasSize.height },
      xScale,
      yScale
    });
    onPositionChange(position);
  }, [logoImage, logoProps, canvasSize.width, canvasSize.height, onPositionChange, xScale, yScale]);

  const handleLogoTransform = () => {
    const node = logoRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // === 允许logo在画布外，不限制位置
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


  return (
    <div className="w-full flex items-center justify-center p-2">
      {/* Konva 画布 */}
      <div 
        className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner"
        style={{ 
          width: canvasSize.width, 
          height: canvasSize.height,
          boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)'
        }}
      >
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
            {/* 扩展区域背景（当 xScale 或 yScale > 1 时显示）*/}
            {(xScale > 1 || yScale > 1) && (
              <Rect
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                fill="#f3f4f6"
                listening={false}
              />
            )}
            
            {/* 背景图片层（扩图模式下居中显示）*/}
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                x={imageRect.x}
                y={imageRect.y}
                width={imageRect.width}
                height={imageRect.height}
                listening={false}
              />
            )}
            
            {/* 扩展区域边界线（当 xScale 或 yScale > 1 时显示）*/}
            {(xScale > 1 || yScale > 1) && backgroundImage && (
              <Rect
                x={imageRect.x}
                y={imageRect.y}
                width={imageRect.width}
                height={imageRect.height}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[5, 5]}
                listening={false}
              />
            )}
            
            {/* Logo 图片层（可选） */}
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
        {!backgroundImage && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 select-none">
            <div className="text-center px-4">
              <p className="text-sm font-medium text-gray-500 mb-1.5">请先上传背景图片</p>
              <p className="text-xs text-gray-400">点击右上角"上传图片"或"上传文件夹"按钮</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
