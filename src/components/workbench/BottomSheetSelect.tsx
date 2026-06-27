"use client";

import React, { useState } from "react";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerPortal,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

/** 兼容渲染 icon：已实例化的元素直接渲染；函数 / forwardRef·memo 组件对象用 createElement 实例化；其余作为 ReactNode 渲染。 */
function OptionIcon({
  icon,
}: {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
}) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return <>{icon}</>;
  if (
    typeof icon === "function" ||
    (typeof icon === "object" && icon !== null && "$$typeof" in icon)
  ) {
    return React.createElement(
      icon as React.ComponentType<{ className?: string }>,
      { className: "h-4 w-4" }
    );
  }
  return <>{icon}</>;
}

export interface BottomSheetSelectOption {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  children?: BottomSheetSelectOption[];
}

interface BottomSheetSelectProps {
  options: BottomSheetSelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  title?: string;
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function BottomSheetSelect({
  options,
  value,
  onChange,
  multiple = false,
  title = "选择选项",
  trigger,
  onOpenChange,
}: BottomSheetSelectProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<string[]>([]);
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCurrentLevel([]);
    }
    onOpenChange?.(newOpen);
  };

  const getCurrentOptions = (): BottomSheetSelectOption[] => {
    let opts = options;
    for (const levelId of currentLevel) {
      const found = opts.find((o) => o.id === levelId);
      if (found?.children) {
        opts = found.children;
      }
    }
    return opts;
  };

  const handleSelect = (optionId: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionId)
        ? selectedValues.filter((v) => v !== optionId)
        : [...selectedValues, optionId];
      onChange?.(newValues);
    } else {
      onChange?.(optionId);
      handleOpenChange(false);
    }
  };

  const handleDrillIn = (option: BottomSheetSelectOption) => {
    if (option.children && option.children.length > 0) {
      setCurrentLevel([...currentLevel, option.id]);
    }
  };

  const handleGoBack = () => {
    setCurrentLevel(currentLevel.slice(0, -1));
  };

  const currentOptions = getCurrentOptions();

  // 桌面端：用 Popover 下拉浮层承载同一套选项（不使用底部抽屉），保证桌面可用且不回归。
  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {trigger || (
            <button
              type="button"
              className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[14px] text-ink"
            >
              {selectedValues.length > 0
                ? selectedValues.length === 1
                  ? options.find((o) => o.id === selectedValues[0])?.label ||
                    "未选择"
                  : `已选择 ${selectedValues.length} 项`
                : "选择选项"}
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-1.5">
          {currentLevel.length > 0 && (
            <button
              type="button"
              onClick={handleGoBack}
              className="mb-1 flex items-center gap-1 px-2 py-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              返回上一层
            </button>
          )}
          <div className="space-y-0.5">
            {currentOptions.map((option) => {
              const isSelected = selectedValues.includes(option.id);
              const hasChildren = option.children && option.children.length > 0;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (hasChildren) {
                      handleDrillIn(option);
                    } else if (!option.disabled) {
                      handleSelect(option.id);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors",
                    option.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-surface-muted",
                    isSelected && "bg-brand-soft"
                  )}
                >
                  {option.icon && (
                    <span
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors",
                        isSelected
                          ? "bg-brand text-white"
                          : "bg-brand-soft text-brand"
                      )}
                    >
                      <OptionIcon icon={option.icon} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold",
                        isSelected ? "text-brand" : "text-ink"
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {hasChildren && !isSelected && (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-3" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: render drawer with options
  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <div onClick={() => handleOpenChange(true)} className="cursor-pointer">
        {trigger || (
          <div className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[14px] text-ink">
            {selectedValues.length > 0
              ? selectedValues.length === 1
                ? options.find((o) => o.id === selectedValues[0])?.label || "未选择"
                : `已选择 ${selectedValues.length} 项`
              : "选择选项"}
          </div>
        )}
      </div>

      <DrawerPortal>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>{title}</DrawerTitle>
              </div>
              {currentLevel.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  className="h-6 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-2">
              {currentOptions.map((option) => {
                const isSelected = selectedValues.includes(option.id);
                const hasChildren = option.children && option.children.length > 0;

                return (
                  <div
                    key={option.id}
                    onClick={() => {
                      if (!hasChildren && !option.disabled) {
                        handleSelect(option.id);
                      } else if (hasChildren) {
                        handleDrillIn(option);
                      }
                    }}
                    className={cn(
                      "group flex items-center gap-3 rounded-[14px] border p-2.5 transition-all",
                      option.disabled
                        ? "cursor-not-allowed border-transparent opacity-50"
                        : "cursor-pointer",
                      isSelected
                        ? "border-brand/30 bg-brand-soft"
                        : "border-transparent hover:bg-surface-muted"
                    )}
                  >
                    {option.icon && (
                      <span
                        className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] transition-colors",
                          isSelected
                            ? "bg-brand text-white"
                            : "bg-brand-soft text-brand"
                        )}
                      >
                        <OptionIcon icon={option.icon} />
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-[14px] font-semibold",
                          isSelected ? "text-brand" : "text-ink"
                        )}
                      >
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="mt-0.5 text-[12px] leading-snug text-ink-3">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}

                    {hasChildren && !isSelected && (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {multiple && selectedValues.length > 0 && (
            <DrawerFooter>
              <DrawerClose asChild>
                <Button className="w-full" onClick={() => handleOpenChange(false)}>
                  确认已选择 {selectedValues.length} 项
                </Button>
              </DrawerClose>
            </DrawerFooter>
          )}

          {!multiple && (
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  关闭
                </Button>
              </DrawerClose>
            </DrawerFooter>
          )}
        </DrawerContent>
      </DrawerPortal>
    </Drawer.Root>
  );
}
