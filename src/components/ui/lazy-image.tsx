'use client';

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  /**
   * 占位图 - 在图片加载前显示
   */
  placeholder?: string;
  /**
   * 缩略图 URL - 用于快速预览
   */
  thumbnailSrc?: string;
  /**
   * 根元素的 margin，用于提前触发加载
   * @default '50px'
   */
  rootMargin?: string;
  /**
   * 加载失败时的回调
   */
  onError?: () => void;
  /**
   * 加载成功时的回调
   */
  onLoad?: () => void;
  /**
   * 容器类名
   */
  containerClassName?: string;
  /**
   * 是否显示加载动画
   * @default true
   */
  showLoadingAnimation?: boolean;
}

/**
 * 懒加载图片组件
 * 
 * 特性:
 * - 使用 Intersection Observer API 实现懒加载
 * - 支持缩略图预览（先加载缩略图，再加载原图）
 * - 渐进式加载动画
 * - 加载失败处理
 * - 可配置的预加载距离
 */
export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E',
  thumbnailSrc,
  rootMargin = '50px',
  onError,
  onLoad,
  className,
  containerClassName,
  showLoadingAnimation = true,
  ...props
}: LazyImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置 Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // 一旦进入视口，停止观察
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin]);

  // 渐进式加载图片
  useEffect(() => {
    if (!isInView) return;
    
    // 如果没有有效的图片 URL，显示错误状态
    if (!src || src === '') {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      try {
        // 如果有缩略图，先加载缩略图
        if (thumbnailSrc && thumbnailSrc !== src && thumbnailSrc !== '') {
          const thumbnailImg = new Image();
          thumbnailImg.src = thumbnailSrc;
          
          await new Promise<void>((resolve, reject) => {
            thumbnailImg.onload = () => resolve();
            thumbnailImg.onerror = reject;
          });

          if (isMounted) {
            setCurrentSrc(thumbnailSrc);
          }
        }

        // 加载原图
        const img = new Image();
        img.src = src;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        if (isMounted) {
          setCurrentSrc(src);
          setIsLoading(false);
          onLoad?.();
        }
      } catch (error) {
        if (isMounted) {
          setIsError(true);
          setIsLoading(false);
          onError?.();
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [isInView, src, thumbnailSrc, onLoad, onError]);

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading && showLoadingAnimation ? 'opacity-0' : 'opacity-100',
          isError && 'opacity-50',
          className
        )}
        {...props}
      />
      
      {/* 加载动画 */}
      {isLoading && showLoadingAnimation && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* 错误状态 */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">加载失败</p>
          </div>
        </div>
      )}
    </div>
  );
}
