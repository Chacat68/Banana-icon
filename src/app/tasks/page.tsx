"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { cn, getApiKeyHeaders } from "@/lib/utils";
import { useTaskStore, type TaskItem, type TaskStatus } from "@/store/task-store";
import Link from "next/link";

interface TaskWithAssets {
  id: string;
  status: string;
  prompt: string;
  negativePrompt: string | null;
  width: number;
  height: number;
  seed: number | null;
  batchSize: number;
  errorMessage: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  assets: {
    id: string;
    filename: string;
    originalUrl: string;
    processedUrl: string | null;
    width: number;
    height: number;
  }[];
}

const statusLabels: Record<string, string> = {
  queued: "排队中",
  running: "生成中",
  success: "已完成",
  failed: "失败",
};

const statusClassNames: Record<string, string> = {
  queued: "status-pill status-pill-queued",
  running: "status-pill status-pill-running",
  success: "status-pill status-pill-success",
  failed: "status-pill status-pill-failed",
};

export default function TasksPage() {
  const [serverTasks, setServerTasks] = useState<TaskWithAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const { tasks: localTasks, updateTask } = useTaskStore();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate");
      const data = (await res.json()) as TaskWithAssets[];
      setServerTasks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Poll running/queued tasks
  useEffect(() => {
    const pending = [
      ...localTasks.filter(
        (t) => t.status === "queued" || t.status === "running"
      ),
    ];
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      for (const task of pending) {
        try {
          const res = await fetch(
            `/api/generate/${encodeURIComponent(task.id)}/status`,
            { headers: getApiKeyHeaders() }
          );
          const data = (await res.json()) as {
            status: string;
            errorMessage?: string;
            assets?: { originalUrl: string }[];
          };
          if (data.status === "success" || data.status === "failed") {
            updateTask(task.id, {
              status: data.status as TaskStatus,
              error: data.errorMessage || undefined,
              imageUrls: data.assets?.map((a) => a.originalUrl) || [],
            });
            loadTasks();
          } else if (data.status !== task.status) {
            updateTask(task.id, { status: data.status as TaskStatus });
          }
        } catch {
          // ignore polling errors
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [localTasks, updateTask, loadTasks]);

  // Merge local tasks with server tasks (local tasks take priority for recent ones)
  const localIds = new Set(localTasks.map((t) => t.id));
  const mergedServerTasks = serverTasks.filter((t) => !localIds.has(t.id));
  const runningCount = [...localTasks, ...mergedServerTasks].filter(
    (task) => task.status === "queued" || task.status === "running"
  ).length;
  const successCount = [...localTasks, ...mergedServerTasks].filter(
    (task) => task.status === "success"
  ).length;
  const failedCount = [...localTasks, ...mergedServerTasks].filter(
    (task) => task.status === "failed"
  ).length;

  return (
    <div className="page-shell page-shell-wide editor-page">
      <div className="editor-toolbar">
        <div>
          <div className="editor-toolbar-meta">Task Monitor</div>
          <div className="editor-toolbar-title">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            生成任务监视器
          </div>
        </div>
        <div className="editor-toolbar-group">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回生成
          </Link>
          <button
            onClick={loadTasks}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            刷新
          </button>
        </div>
      </div>

      <div className="editor-stat-strip">
        <div className="editor-stat">
          <div className="editor-stat-title">处理中</div>
          <div className="editor-stat-value font-display">{runningCount}</div>
          <div className="editor-stat-note">正在排队或生成中的任务</div>
        </div>
        <div className="editor-stat">
          <div className="editor-stat-title">已完成</div>
          <div className="editor-stat-value font-display">{successCount}</div>
          <div className="editor-stat-note">已经拿到结果图的任务</div>
        </div>
        <div className="editor-stat">
          <div className="editor-stat-title">异常</div>
          <div className="editor-stat-value font-display">{failedCount}</div>
          <div className="editor-stat-note">需要重新生成或检查配置</div>
        </div>
        <div className="editor-stat">
          <div className="editor-stat-title">本地会话</div>
          <div className="editor-stat-value font-display">{localTasks.length}</div>
          <div className="editor-stat-note">当前浏览器会话缓存中的任务</div>
        </div>
      </div>

      <div className="section-panel">
        <div className="section-panel-inner">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              生成任务
            </h1>
          </div>
          <span className="editor-chip">Queue View</span>
        </div>

        {/* Local tasks (in-progress) */}
        {localTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              当前会话任务
            </h2>
            <div className="space-y-3">
              {localTasks.map((task) => (
                <LocalTaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Server tasks (historical) */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">
            历史任务
          </h2>
          {loading && serverTasks.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-zinc-500">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-zinc-600" />
              <p>加载中…</p>
            </div>
          ) : mergedServerTasks.length === 0 && localTasks.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-zinc-500">
              <Sparkles className="mb-3 h-10 w-10 text-zinc-700" />
              <p>暂无生成任务</p>
              <Link
                href="/"
                className="mt-3 text-sm text-yellow-500 hover:text-yellow-400"
              >
                去创建一个 →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {mergedServerTasks.map((task) => (
                <ServerTaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

/* ── Local task card (from zustand store) ── */
function LocalTaskCard({ task }: { task: TaskItem }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="task-card-grid">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className={cn(statusClassNames[task.status])}>
          {task.status === "running" && (
            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          )}
              {statusLabels[task.status]}
            </span>
            <span className="text-xs text-zinc-600">
              {new Date(task.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="mb-3 text-sm leading-6 text-zinc-300">{task.prompt}</p>
          <div className="meta-row">
            <span className="meta-chip">来源: 当前会话</span>
            <span className="meta-chip">结果数: {task.imageUrls.length}</span>
          </div>
          {task.error && (
            <p className="mt-3 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {task.error}
            </p>
          )}
        </div>
        <div>
          {task.imageUrls.length > 0 ? (
            <div className="task-preview-grid">
              {task.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Generated ${i}`}
                  className="h-24 w-full rounded-lg border border-zinc-700 object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-700 px-4 text-center text-xs text-zinc-500">
              输出预览会在任务完成后显示在这里。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Server task card (from DB) ── */
function ServerTaskCard({ task }: { task: TaskWithAssets }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="task-card-grid">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn(statusClassNames[task.status] || statusClassNames.queued)}>
                {task.status === "running" && (
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                )}
                {statusLabels[task.status] || task.status}
              </span>
            </div>
            <span className="text-xs text-zinc-600">
              {new Date(task.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mb-3 text-sm leading-6 text-zinc-300">{task.prompt}</p>
          <div className="meta-row">
            <span className="meta-chip">尺寸: {task.width}×{task.height}</span>
            <span className="meta-chip">批量: {task.batchSize}</span>
            <span className="meta-chip">产出: {task.assets.length}</span>
            {task.seed !== null && <span className="meta-chip">Seed: {task.seed}</span>}
          </div>
          {task.errorMessage && (
            <p className="mt-3 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {task.errorMessage}
            </p>
          )}
          {task.assets.length === 0 && task.status === "success" && (
            <p className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
              <ImageIcon className="h-3 w-3" />
              任务已完成，但没有可展示的生成结果。
            </p>
          )}
        </div>
        <div>
          {task.assets.length > 0 ? (
            <div className="task-preview-grid">
              {task.assets.map((asset) => (
                <img
                  key={asset.id}
                  src={asset.processedUrl || asset.originalUrl}
                  alt={asset.filename}
                  className="h-24 w-full rounded-lg border border-zinc-700 object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-700 px-4 text-center text-xs text-zinc-500">
              当前任务还没有关联素材预览。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
