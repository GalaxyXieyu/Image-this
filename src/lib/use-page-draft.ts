"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

/**
 * usePageDraft — 路由级状态缓存 hook
 *
 * 行为类似 useState，但在组件卸载/重新挂载时自动恢复上一次的状态。
 * 双层缓存：
 *   1. 内存 Map — 路由切换时同步恢复（零闪烁、无 hydration 问题）
 *   2. sessionStorage — 页面刷新时异步恢复（useEffect 中读取）
 *
 * 数据流：
 *   路由切换（客户端导航）：useState initializer 从内存 Map 直接读 → 同步恢复
 *   页面刷新（SSR + hydrate）：SSR 用 initial → 客户端 useEffect 从 sessionStorage 异步恢复
 *   状态变化：useEffect 同步写入内存 Map + sessionStorage
 */

// 模块级内存缓存池：组件卸载但模块不销毁，路由切换时保留
const memoryCache = new Map<string, unknown>();

const STORAGE_PREFIX = "page-draft:";

function readFromStorage(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function clearFromStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

export function usePageDraft<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const getInitial = (): T => {
    // 路由切换场景：内存缓存有值，直接同步恢复
    if (memoryCache.has(key)) {
      return memoryCache.get(key) as T;
    }
    // 页面刷新或首次进入：用 initial 值（SSR 安全）
    return typeof initial === "function" ? (initial as () => T)() : initial;
  };

  const [state, setState] = useState<T>(getInitial);
  const shouldSkipFirstWriteRef = useRef(false);

  // 页面刷新恢复：内存缓存为空时从 sessionStorage 异步恢复
  useEffect(() => {
    if (memoryCache.has(key)) return; // 路由切换已恢复，跳过

    const fromStorage = readFromStorage(key);
    if (fromStorage !== undefined && fromStorage !== null) {
      shouldSkipFirstWriteRef.current = true;
      memoryCache.set(key, fromStorage);
      setState(fromStorage as T);
      return;
    }

    shouldSkipFirstWriteRef.current = false;
  }, [key]);

  // 每次状态变化时同步到双层缓存
  useEffect(() => {
    if (shouldSkipFirstWriteRef.current) {
      shouldSkipFirstWriteRef.current = false;
      return;
    }
    memoryCache.set(key, state);
    writeToStorage(key, state);
  }, [key, state]);

  return [state, setState];
}

/** 手动清除指定 key 的缓存 */
export function clearPageDraft(key: string) {
  memoryCache.delete(key);
  clearFromStorage(key);
}