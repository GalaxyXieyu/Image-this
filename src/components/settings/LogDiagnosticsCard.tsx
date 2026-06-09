'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clipboard, FileSearch, Folder, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import type { DesktopLogFile, DesktopLogInfo } from '@/types/electron';

type ParsedLogLine = {
  id: string;
  lineNumber: number;
  timestamp?: string;
  level?: string;
  message: string;
  kind: 'entry' | 'stack' | 'detail' | 'blank';
};

const LOG_ENTRY_PATTERN = /^\[([^\]]+)\]\s+\[([A-Z]+)\]\s?(.*)$/;
const LOG_TAIL_BYTES = 128 * 1024;

function parseLogLines(content: string): ParsedLogLine[] {
  if (!content.trim()) {
    return [];
  }

  return content.split(/\r?\n/).map((raw, index) => {
    const lineNumber = index + 1;
    const matched = raw.match(LOG_ENTRY_PATTERN);
    if (matched) {
      return {
        id: `${lineNumber}-${raw.slice(0, 16)}`,
        lineNumber,
        timestamp: matched[1],
        level: matched[2],
        message: matched[3] || '',
        kind: 'entry',
      };
    }

    const trimmed = raw.trim();
    const isStackLine =
      trimmed.startsWith('at ') ||
      trimmed.startsWith('***') ||
      trimmed.startsWith('Error:') ||
      /^[A-Z_]+:/.test(trimmed) ||
      raw.includes('\\ImagineThis\\resources\\app\\') ||
      raw.includes('/ImagineThis/resources/app/');

    return {
      id: `${lineNumber}-${raw.slice(0, 16)}`,
      lineNumber,
      message: raw,
      kind: trimmed ? (isStackLine ? 'stack' : 'detail') : 'blank',
    };
  });
}

function getLogLevelClass(level?: string) {
  switch (level) {
    case 'ERROR':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'WARN':
      return 'border-warning/20 bg-warning/10 text-warning';
    case 'INFO':
      return 'border-primary/20 bg-primary/10 text-primary';
    default:
      return 'border-border bg-secondary text-muted-foreground';
  }
}

function getLogRowClass(line: ParsedLogLine) {
  if (line.level === 'ERROR') {
    return 'border-destructive/10 bg-destructive/5';
  }
  if (line.level === 'WARN') {
    return 'border-warning/10 bg-warning/5';
  }
  if (line.kind === 'stack') {
    return 'border-border bg-secondary/50';
  }
  return 'border-border bg-card';
}

function getLogStats(lines: ParsedLogLine[]) {
  return lines.reduce(
    (stats, line) => {
      if (line.level === 'ERROR') stats.errors += 1;
      if (line.level === 'WARN') stats.warnings += 1;
      if (line.kind === 'stack') stats.stackLines += 1;
      return stats;
    },
    { errors: 0, warnings: 0, stackLines: 0 }
  );
}

export function LogDiagnosticsCard() {
  const { toast } = useToast();
  const [logInfo, setLogInfo] = useState<DesktopLogInfo | null>(null);
  const [logFiles, setLogFiles] = useState<DesktopLogFile[]>([]);
  const [selectedLogFile, setSelectedLogFile] = useState('');
  const [logContent, setLogContent] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const parsedLogLines = useMemo(() => parseLogLines(logContent), [logContent]);
  const logStats = useMemo(() => getLogStats(parsedLogLines), [parsedLogLines]);

  const loadLogs = useCallback(async (preferredFile?: string) => {
    if (typeof window === 'undefined' || !window.electron?.logs) {
      setLogInfo(null);
      setLogFiles([]);
      setLogContent('');
      return;
    }

    setIsLoadingLogs(true);
    try {
      const [info, files] = await Promise.all([
        window.electron.logs.getInfo(),
        window.electron.logs.listFiles(),
      ]);
      setLogInfo(info);
      setLogFiles(files);

      const nextFile = preferredFile || info.errorLogFile || info.appLogFile || files[0]?.name || '';
      setSelectedLogFile(nextFile);

      if (nextFile) {
        const tail = await window.electron.logs.readTail({
          fileName: nextFile,
          maxBytes: LOG_TAIL_BYTES,
        });
        setLogContent(tail.content || '');
      } else {
        setLogContent('');
      }
    } catch (error) {
      toast({
        title: '日志读取失败',
        description: error instanceof Error ? error.message : '无法读取日志',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLogs(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleSelectLogFile = async (fileName: string) => {
    setSelectedLogFile(fileName);
    if (!window.electron?.logs) return;
    setIsLoadingLogs(true);
    try {
      const tail = await window.electron.logs.readTail({
        fileName,
        maxBytes: LOG_TAIL_BYTES,
      });
      setLogContent(tail.content || '');
    } catch (error) {
      toast({
        title: '日志读取失败',
        description: error instanceof Error ? error.message : '无法读取日志',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleOpenLogDirectory = async () => {
    if (!window.electron?.logs) {
      toast({ title: '当前环境不可用', description: '日志目录只能在桌面版中打开。', variant: 'destructive' });
      return;
    }
    await window.electron.logs.openDirectory();
  };

  const handleChooseLogDirectory = async () => {
    if (!window.electron?.logs) {
      toast({ title: '当前环境不可用', description: '日志目录只能在桌面版中配置。', variant: 'destructive' });
      return;
    }
    const info = await window.electron.logs.chooseDirectory();
    setLogInfo(info);
    await loadLogs();
  };

  const handleResetLogDirectory = async () => {
    if (!window.electron?.logs) {
      return;
    }
    const info = await window.electron.logs.resetDirectory();
    setLogInfo(info);
    await loadLogs();
  };

  const handleCopyLogContent = async () => {
    if (!logContent) return;
    await navigator.clipboard.writeText(logContent);
    toast({
      title: '已复制',
      description: '当前日志原文已复制到剪贴板',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center">
                <FileSearch className="w-5 h-5 mr-2 text-primary" />
                日志诊断
              </CardTitle>
              <CardDescription className="mt-1">
                查看桌面端启动、后台任务、更新和接口错误日志
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => loadLogs()} disabled={isLoadingLogs}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button type="button" variant="outline" onClick={handleOpenLogDirectory}>
                <FolderOpen className="w-4 h-4 mr-2" />
                打开目录
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <div className="text-caption font-medium text-muted-foreground mb-1">当前日志目录</div>
            <div className="font-mono text-data text-foreground break-all">
              {logInfo?.directory || '仅桌面版可用'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleChooseLogDirectory}>
                <Folder className="w-4 h-4 mr-2" />
                选择目录
              </Button>
              {logInfo?.isCustom && (
                <Button type="button" size="sm" variant="ghost" onClick={handleResetLogDirectory}>
                  恢复默认目录
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <LogFileList
              files={logFiles}
              selectedFile={selectedLogFile}
              onSelect={handleSelectLogFile}
            />
            <LogContentViewer
              fileName={selectedLogFile}
              content={logContent}
              lines={parsedLogLines}
              stats={logStats}
              isLoading={isLoadingLogs}
              onCopy={handleCopyLogContent}
            />
          </div>

          <div className="text-caption text-muted-foreground">
            日志内容会在读取时做基础脱敏，并且只读取文件末尾片段，避免大日志卡住界面。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogFileList({
  files,
  selectedFile,
  onSelect,
}: {
  files: DesktopLogFile[];
  selectedFile: string;
  onSelect: (fileName: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="px-4 py-3 bg-secondary/50 border-b">
        <div className="text-data font-semibold text-foreground">日志文件</div>
        <div className="text-caption text-muted-foreground mt-0.5">选择一个文件查看末尾片段</div>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-data text-muted-foreground">暂无日志文件</div>
        ) : (
          files.map((file) => (
            <button
              key={file.name}
              type="button"
              onClick={() => onSelect(file.name)}
              className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-primary/5 ${
                selectedFile === file.name
                  ? 'bg-primary/5 text-primary ring-1 ring-inset ring-primary/20'
                  : 'text-foreground'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-data font-semibold truncate">{file.name}</div>
                {file.name.startsWith('error-') && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    error
                  </span>
                )}
              </div>
              <div className="mt-1 text-caption text-muted-foreground">
                {(file.sizeBytes / 1024).toFixed(1)} KB · {new Date(file.modifiedAt).toLocaleString('zh-CN')}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function LogContentViewer({
  fileName,
  content,
  lines,
  stats,
  isLoading,
  onCopy,
}: {
  fileName: string;
  content: string;
  lines: ParsedLogLine[];
  stats: ReturnType<typeof getLogStats>;
  isLoading: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
      <div className="border-b bg-secondary/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-data font-semibold text-foreground truncate">
              {fileName || '未选择日志'}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              <span>{lines.length} 行</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span>{(content.length / 1024).toFixed(1)} KB 已读取</span>
              {stats.errors > 0 && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                  {stats.errors} error
                </span>
              )}
              {stats.warnings > 0 && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning">
                  {stats.warnings} warn
                </span>
              )}
              {stats.stackLines > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                  {stats.stackLines} stack
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCopy}
            disabled={!content}
            className="shrink-0"
          >
            <Clipboard className="w-4 h-4 mr-2" />
            复制原文
          </Button>
        </div>
      </div>
      <div className="h-[560px] overflow-auto bg-secondary/30 p-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-data text-muted-foreground">
            正在读取日志...
          </div>
        ) : lines.length === 0 ? (
          <div className="flex h-full items-center justify-center text-data text-muted-foreground">
            暂无日志内容
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => (
              <LogLineRow key={line.id} line={line} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogLineRow({ line }: { line: ParsedLogLine }) {
  return (
    <div className={`grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-lg border px-3 py-2 ${getLogRowClass(line)}`}>
      <div className="select-none pt-0.5 text-right font-mono text-[11px] text-muted-foreground/60">
        {line.lineNumber}
      </div>
      <div className="min-w-0">
        {line.kind === 'entry' ? (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {line.level && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getLogLevelClass(line.level)}`}>
                {line.level}
              </span>
            )}
            {line.timestamp && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {line.timestamp.replace('T', ' ').replace('Z', '')}
              </span>
            )}
          </div>
        ) : null}
        <div
          className={`whitespace-pre-wrap break-words font-mono text-[12px] leading-6 ${
            line.kind === 'stack'
              ? 'pl-3 text-muted-foreground'
              : line.level === 'ERROR'
                ? 'text-destructive/90'
                : 'text-foreground'
          }`}
        >
          {line.kind === 'blank' ? '\u00a0' : line.message}
        </div>
      </div>
    </div>
  );
}
