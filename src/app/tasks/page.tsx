"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Trash2,
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回生成
            </Link>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              生成任务
            </h1>
          </div>
          <button
            onClick={loadTasks}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            刷新
          </button>
        </div>

        {/* Local tasks (in-progress) */}
        {localTasks.length > 0 && (
          <div className="mb-6">
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
  );
}

/* ── Local task card (from zustand store) ── */
function LocalTaskCard({ task }: { task: TaskItem }) {
  const statusColors: Record<string, string> = {
    queued: "text-zinc-400 bg-zinc-800",
    running: "text-blue-400 bg-blue-500/10",
    success: "text-green-400 bg-green-500/10",
    failed: "text-red-400 bg-red-500/10",
  };
  const statusLabels: Record<string, string> = {
    queued: "排队中",
    running: "生成中",
    success: "已完成",
    failed: "失败",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            statusColors[task.status]
          )}
        >
          {task.status === "running" && (
            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          )}
          {statusLabels[task.status]}
        </span>
        <span className="text-xs text-zinc-600">
          {new Date(task.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <p className="mb-2 text-sm text-zinc-300 line-clamp-2">{task.prompt}</p>
      {task.error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {task.error}
        </p>
      )}
      {task.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {task.imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Generated ${i}`}
              className="h-24 w-24 rounded-lg border border-zinc-700 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Server task card (from DB) ── */
function ServerTaskCard({ task }: { task: TaskWithAssets }) {
  const statusColors: Record<string, string> = {
    queued: "text-zinc-400 bg-zinc-800",
    running: "text-blue-400 bg-blue-500/10",
    success: "text-green-400 bg-green-500/10",
    failed: "text-red-400 bg-red-500/10",
  };
  const statusLabels: Record<string, string> = {
    queued: "排队中",
    running: "生成中",
    success: "已完成",
    failed: "失败",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              statusColors[task.status] || statusColors.queued
            )}
          >
            {task.status === "running" && (
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
            )}
            {statusLabels[task.status] || task.status}
          </span>
          <span className="text-xs text-zinc-600">
            {task.width}×{task.height}
          </span>
          {task.batchSize > 1 && (
            <span className="text-xs text-zinc-600">
              ×{task.batchSize}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-600">
          {new Date(task.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="mb-2 text-sm text-zinc-300 line-clamp-2">{task.prompt}</p>
      {task.errorMessage && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {task.errorMessage}
        </p>
      )}
      {task.assets.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {task.assets.map((asset) => (
            <img
              key={asset.id}
              src={asset.processedUrl || asset.originalUrl}
              alt={asset.filename}
              className="h-24 w-24 rounded-lg border border-zinc-700 object-cover"
            />
          ))}
        </div>
      )}
      {task.assets.length === 0 && task.status === "success" && (
        <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
          <ImageIcon className="h-3 w-3" />
          无生成结果
        </p>
      )}
    </div>
  );
}
