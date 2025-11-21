'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /**
   * 是否还有更多数据
   */
  hasMore: boolean;
  /**
   * 是否正在加载
   */
  isLoading: boolean;
  /**
   * 加载更多数据的回调
   */
  onLoadMore: () => void;
  /**
   * 触发加载的距离阈值（距离底部多少像素时触发）
   * @default 200
   */
  threshold?: number;
  /**
   * 根元素的 margin
   * @default '0px'
   */
  rootMargin?: string;
}

/**
 * 无限滚动 Hook
 * 
 * 使用 Intersection Observer 监听滚动位置，
 * 当接近底部时自动加载更多数据
 * 
 * @example
 * ```tsx
 * const loadMoreRef = useInfiniteScroll({
 *   hasMore: hasMoreData,
 *   isLoading: isLoadingMore,
 *   onLoadMore: fetchMoreImages,
 *   threshold: 200
 * });
 * 
 * return (
 *   <div>
 *     {images.map(img => <ImageCard key={img.id} {...img} />)}
 *     <div ref={loadMoreRef} />
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200,
  rootMargin = '0px',
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      
      // 当目标元素进入视口且还有更多数据且未在加载时，触发加载
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null, // 使用视口作为根元素
      rootMargin: `${threshold}px`, // 提前触发
      threshold: 0.1,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold]);

  return loadMoreRef;
}
