"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { BrandEmptyState } from "@/components/brands/SpriteImage";
import { cn } from "@/lib/utils";
import { Plus, Edit, Trash2, Star, StarOff, FileText, History, ChevronsUpDown, FlaskConical } from "lucide-react";
import { CATEGORY_LABELS, type PromptTemplate } from "@/components/settings/model-select";

export function SettingsPromptsSection({
  isMobile, templates, isLoadingTemplates, selectedCategory, setSelectedCategory,
  setIsCreateDialogOpen, openVersionDialog, openEditDialog, openDeleteDialog, handleSetDefault
}: {
  isMobile: boolean;
  templates: PromptTemplate[];
  isLoadingTemplates: boolean;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  setIsCreateDialogOpen: (v: boolean) => void;
  openVersionDialog: (t: PromptTemplate) => void;
  openEditDialog: (t: PromptTemplate) => void;
  openDeleteDialog: (t: PromptTemplate) => void;
  handleSetDefault: (t: PromptTemplate) => void;
}) {

        const filteredTemplates = selectedCategory === 'ALL'
          ? templates
          : templates.filter(t => t.category === selectedCategory);

        return (
          <div className="space-y-6">
            {/* 工具栏 */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-[18px] sm:text-body">
                      <FileText className="w-5 h-5 text-primary" />
                      提示词模板管理
                    </CardTitle>
                    <CardDescription className="mt-1 hidden sm:block">
                      管理您的 AI 提示词模板，包括背景替换、扩图、高清化和一键增强等场景
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="min-h-11 w-full gap-2 sm:w-auto">
                    <Plus className="w-4 h-4" />
                    新建模板
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <Label className="hidden text-data font-medium sm:block">筛选分类:</Label>
                  {isMobile ? (
                    <BottomSheetSelect
                      title="筛选分类"
                      value={selectedCategory}
                      onChange={(value) => {
                        if (typeof value === 'string') setSelectedCategory(value);
                      }}
                      options={[
                        { id: 'ALL', label: '全部分类' },
                        ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
                          id: value,
                          label,
                        })),
                      ]}
                      trigger={
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-line-strong bg-surface px-3.5 text-[14px] font-medium text-ink"
                        >
                          <span className="inline-flex items-center gap-2 text-ink-2">
                            <FileText className="h-4 w-4 text-ink-3" />
                            {selectedCategory === 'ALL' ? '全部分类' : CATEGORY_LABELS[selectedCategory]}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-3" />
                        </button>
                      }
                    />
                  ) : (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="hidden min-h-11 w-full sm:flex sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">全部分类</SelectItem>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 模板列表 */}
            {isLoadingTemplates ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-body flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex flex-wrap items-center gap-1">
                            {CATEGORY_LABELS[template.category]}
                            {template.isSystem && (
                              <span className="text-caption px-2 py-0.5 bg-primary/10 text-primary rounded">
                                系统
                              </span>
                            )}
                            {template.isDefault && (
                              <span className="text-caption px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                                默认
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.description && (
                        <p className="mb-3 hidden text-data text-muted-foreground sm:block">{template.description}</p>
                      )}
                      <div className="mb-4 hidden rounded-md border border-border bg-muted p-3 sm:block">
                        <p className="text-caption text-muted-foreground line-clamp-3">{template.prompt}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                          className="min-h-10 gap-1"
                        >
                          {template.isDefault ? (
                            <>
                              <StarOff className="w-4 h-4" />
                              取消默认
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4" />
                              设为默认
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openVersionDialog(template)}
                          className="min-h-10 gap-1"
                        >
                          <History className="w-4 h-4" />
                          版本{template._count?.versions ? ` (${template._count.versions})` : ''}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                          className="min-h-10 gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="min-h-10 gap-1">
                          <Link href={`/prompt-studio?templateId=${template.id}`}>
                            <FlaskConical className="w-4 h-4" />
                            工作室
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(template)}
                          disabled={template.isSystem}
                          className="min-h-10 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <BrandEmptyState
                    pose="think"
                    title="暂无提示词模板"
                    description=""
                    className="border-0 bg-transparent py-12"
                    action={
                      <Button onClick={() => setIsCreateDialogOpen(true)} className="min-h-11 gap-2">
                        <Plus className="w-4 h-4" />
                        创建第一个模板
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        );

}
