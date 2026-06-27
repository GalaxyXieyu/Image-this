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
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

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

  // Desktop fallback: render simple list or pass through trigger
  if (!isMobile) {
    return <>{trigger}</>;
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
                      "group flex items-center gap-3 rounded-[12px] p-3 transition-colors",
                      option.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-surface",
                      isSelected && "bg-accent-gradient"
                    )}
                  >
                    {option.icon && (
                      <div className="flex-shrink-0 text-ink">
                        {React.isValidElement(option.icon) ? (
                          option.icon
                        ) : typeof option.icon === "function" ? (
                          React.createElement(option.icon, { className: "h-4 w-4" })
                        ) : (
                          option.icon
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-[14px] font-medium",
                          isSelected ? "text-ink" : "text-ink"
                        )}
                      >
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="mt-0.5 text-[12px] text-ink-3">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="flex-shrink-0">
                        <Check className="h-4 w-4 text-brand" />
                      </div>
                    )}

                    {hasChildren && !isSelected && (
                      <div className="flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
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
