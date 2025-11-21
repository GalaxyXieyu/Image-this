"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
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

  // 加载背景图片并计算画布尺寸（允许空白）
  useEffect(() => {
    if (!imageUrl) {
      setBackgroundImage(null);
      setCanvasSize({ width: containerWidth, height: containerHeight });
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackgroundImage(img);
      // 计算适应容器的画布尺寸（保持原图比例）
      const imgAspect = img.width / img.height;
      const containerAspect = containerWidth / containerHeight;
      let canvasW, canvasH;
      if (imgAspect > containerAspect) {
        canvasW = containerWidth;
        canvasH = containerWidth / imgAspect;
      } else {
        canvasH = containerHeight;
        canvasW = containerHeight * imgAspect;
      }
      setCanvasSize({ width: canvasW, height: canvasH });
    };
    img.src = imageUrl;
  }, [imageUrl, containerWidth, containerHeight]);

  // 加载 Logo 图片（可选）并检查透明度
  useEffect(() => {
    if (!logoUrl) {
      setLogoImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLogoImage(img);
      // 初始 Logo 尺寸（保持宽高比）
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

  // 通知父组件位置变化（仅在有 Logo 时）
  useEffect(() => {
    if (!logoImage) return;
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
  }, [logoImage, logoProps, canvasSize.width, canvasSize.height, onPositionChange]);

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


  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Konva 画布 */}
      <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center" style={{ minHeight: containerHeight }}>
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
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm select-none">
            <div className="text-center">
              <p className="text-base mb-2">请先上传背景图片</p>
              <p className="text-xs">点击右上角"上传图片"或"上传文件夹"按钮</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
