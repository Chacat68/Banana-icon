"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Sparkles, Loader2, AlertCircle, ChevronDown, ImagePlus, X, ListTodo, Plus, Trash2, Layers, FolderOpen } from "lucide-react";
import { cn, getApiKeyHeaders } from "@/lib/utils";
import { useTaskStore, type TaskItem, type TaskStatus } from "@/store/task-store";
import { v4 as uuid } from "uuid";
import Link from "next/link";

const STYLE_PRESETS = [
  { label: "像素风 RPG", value: "pixel art, retro RPG style, 16-bit" },
  { label: "卡通手游", value: "cartoon, mobile game style, vibrant colors" },
  { label: "二次元", value: "anime style, cel shading, Japanese animation, vivid colors" },
  { label: "赛博朋克", value: "cyberpunk, neon glow, futuristic" },
  { label: "水彩手绘", value: "watercolor, hand-painted, soft edges" },
  { label: "扁平图标", value: "flat design, icon style, minimal, clean" },
  { label: "3D 渲染", value: "3D render, isometric, clay render" },
];

const BACKGROUND_OPTIONS = ["透明", "白色", "黑色", "渐变", "场景化"];
const SIZES = [
  { label: "64×64", w: 64, h: 64 },
  { label: "128×128", w: 128, h: 128 },
  { label: "256×256", w: 256, h: 256 },
  { label: "512×512", w: 512, h: 512 },
  { label: "1024×1024", w: 1024, h: 1024 },
];

interface Project {
  id: string;
  name: string;
}

export default function GeneratePage() {
  // Form state
  const [subject, setSubject] = useState("");
  const [style, setStyle] = useState(STYLE_PRESETS[0].value);

  const [background, setBackground] = useState("透明");
  const [extras, setExtras] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState(SIZES[3]);
  const [batchSize, setBatchSize] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceImagePreview, setReferenceImagePreview] = useState("");
  const [uploadingRef, setUploadingRef] = useState(false);
  const [draggingRef, setDraggingRef] = useState(false);

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchFiles, setBatchFiles] = useState<{ file: File; preview: string }[]>([]);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const { tasks, addTask, updateTask } = useTaskStore();

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json() as Promise<Project[]>)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
      })
      .catch(() => {});
  }, []);

  const createProject = useCallback(async () => {
    if (!newProjectName.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim() }),
    });
    const project = await res.json() as Project;
    setProjects((p) => [project, ...p]);
    setSelectedProject(project.id);
    setNewProjectName("");
    setShowNewProject(false);
  }, [newProjectName]);

  const handleRefImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingRef(true);
    // Local preview
    const previewUrl = URL.createObjectURL(file);
    setReferenceImagePreview(previewUrl);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url: string };
      if (res.ok) {
        setReferenceImageUrl(data.url);
      } else {
        setReferenceImagePreview("");
      }
    } catch {
      setReferenceImagePreview("");
    } finally {
      setUploadingRef(false);
    }
  }, []);

  const clearRefImage = useCallback(() => {
    setReferenceImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setReferenceImageUrl("");
  }, []);

  const handleBatchFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const newFiles = Array.from(e.target.files)
        .filter((f) => f.type.startsWith("image/"))
        .map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setBatchFiles((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    },
    []
  );

  const removeBatchFile = useCallback((index: number) => {
    setBatchFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearBatchFiles = useCallback(() => {
    setBatchFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url: string };
      return res.ok ? data.url : null;
    } catch {
      return null;
    }
  }, []);

  const submitSingle = useCallback(async (subjectText: string, refUrl?: string) => {
    const taskId = uuid();
    const localTask: TaskItem = {
      id: taskId,
      prompt: `${subjectText}, ${style}`,
      status: "queued",
      imageUrls: [],
      createdAt: new Date().toISOString(),
    };
    addTask(localTask);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getApiKeyHeaders() },
        body: JSON.stringify({
          projectId: selectedProject,
          subject: subjectText,
          style,
          background,
          extras,
          negativePrompt,
          width: size.w,
          height: size.h,
          batchSize,
          referenceImageUrl: refUrl || referenceImageUrl || undefined,
        }),
      });
      const data = await res.json() as { id: string; status: string; error?: string };
      if (!res.ok) {
        updateTask(taskId, { status: "failed", error: data.error || `Server error (${res.status})` });
        return;
      }
      updateTask(taskId, { id: data.id, status: data.status as TaskStatus });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      updateTask(taskId, { status: "failed", error: message });
    }
  }, [
    style, background, extras,
    negativePrompt, size, batchSize, selectedProject, referenceImageUrl,
    addTask, updateTask,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!selectedProject || !subject.trim()) return;
    setSubmitting(true);

    if (batchMode) {
      if (batchFiles.length === 0) { setSubmitting(false); return; }
      for (const { file } of batchFiles) {
        const url = await uploadFile(file);
        if (url) {
          await submitSingle(subject.trim(), url);
        }
      }
      clearBatchFiles();
    } else {
      await submitSingle(subject.trim());
    }

    setSubmitting(false);
  }, [
    subject, batchMode, batchFiles, selectedProject, submitSingle, uploadFile, clearBatchFiles,
  ]);

  const pendingCount = tasks.filter(
    (t) => t.status === "queued" || t.status === "running"
  ).length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            生成游戏素材
          </h1>
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ListTodo className="h-4 w-4" />
            查看任务
            {pendingCount > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-xs font-medium text-black">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>

        {/* Project selector */}
        <label className="mb-1 block text-sm text-zinc-400">项目</label>
        <div className="mb-4 flex gap-2">
          {showNewProject ? (
            <>
              <input
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                placeholder="输入项目名称"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createProject()}
              />
              <button
                className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400"
                onClick={createProject}
              >
                创建
              </button>
              <button
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                onClick={() => setShowNewProject(false)}
              >
                取消
              </button>
            </>
          ) : (
            <>
              <div className="relative flex-1">
                <select
                  className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-8 text-sm outline-none focus:border-yellow-500"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {projects.length === 0 && (
                    <option value="">无项目 — 请先创建</option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
              <button
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                onClick={() => setShowNewProject(true)}
              >
                + 新建
              </button>
            </>
          )}
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setBatchMode(false)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              !batchMode
                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500"
                : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            单个生成
          </button>
          <button
            onClick={() => setBatchMode(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              batchMode
                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500"
                : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            批量模式
          </button>
        </div>

        {/* Subject */}
        <label className="mb-1 block text-sm text-zinc-400">素材描述 *</label>
        <textarea
          className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
          rows={3}
          placeholder="例如：一把发光的蓝色魔法剑、一个可爱的史莱姆怪物"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {/* Batch file picker */}
        {batchMode && (
          <>
            <label className="mb-1 block text-sm text-zinc-400">选择要修改的素材 *</label>
            <input
              ref={batchFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleBatchFilesSelected}
              className="hidden"
            />
            <button
              onClick={() => batchFileInputRef.current?.click()}
              className="mb-2 w-full rounded-lg border-2 border-dashed border-zinc-700 px-4 py-4 text-sm text-zinc-400 transition-colors hover:border-yellow-500/50 hover:text-zinc-300"
            >
              <div className="flex items-center justify-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {batchFiles.length > 0
                  ? `已选择 ${batchFiles.length} 个素材，点击继续添加`
                  : "点击选择素材图片 (PNG, JPG, WebP, GIF)"}
              </div>
            </button>
            {batchFiles.length > 0 && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{batchFiles.length} 个文件</span>
                  <button
                    onClick={clearBatchFiles}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    清空全部
                  </button>
                </div>
                <div className="mb-4 grid grid-cols-6 gap-2">
                  {batchFiles.map((item, i) => (
                    <div key={i} className="group relative">
                      <div className="aspect-square overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeBatchFile(i)}
                        className="absolute -right-1 -top-1 hidden rounded-full bg-zinc-800 p-0.5 text-zinc-400 hover:text-red-400 group-hover:block"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-600">{item.file.name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {batchFiles.length === 0 && (
              <p className="mb-4 text-xs text-zinc-600">每个素材将作为参考图，使用相同的提示词生成新版本</p>
            )}
          </>
        )}

        {/* Style */}
        <label className="mb-1 block text-sm text-zinc-400">风格预设</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                style === preset.value
                  ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              )}
              onClick={() => setStyle(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Reference Image */}
        <label className="mb-1 block text-sm text-zinc-400">风格参考图</label>
        <div
          className="mb-4"
          onDragOver={(e) => {
            e.preventDefault();
            if (!referenceImagePreview) setDraggingRef(true);
          }}
          onDragLeave={() => setDraggingRef(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDraggingRef(false);
            const f = e.dataTransfer.files?.[0];
            if (f && f.type.startsWith("image/")) handleRefImageUpload(f);
          }}
        >
          {referenceImagePreview ? (
            <div className="relative inline-block">
              <img
                src={referenceImagePreview}
                alt="参考图"
                className="h-32 w-32 rounded-lg border border-zinc-700 object-cover"
              />
              {uploadingRef && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                </div>
              )}
              <button
                onClick={clearRefImage}
                className="absolute -right-2 -top-2 rounded-full bg-zinc-800 p-0.5 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className={cn(
              "flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed transition-colors",
              draggingRef
                ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                : "border-zinc-700 text-zinc-500 hover:border-yellow-500 hover:text-yellow-400"
            )}>
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">{draggingRef ? "松开上传" : "点击或拖拽上传参考图"}</span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRefImageUpload(f);
                }}
              />
            </label>
          )}
          <p className="mt-1 text-[10px] text-zinc-600">上传参考图以提取风格提示词</p>
        </div>

        {/* Background / Size / Batch */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">背景</label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs outline-none"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            >
              {BACKGROUND_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">尺寸</label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs outline-none"
              value={`${size.w}x${size.h}`}
              onChange={(e) => {
                const s = SIZES.find((s) => `${s.w}x${s.h}` === e.target.value);
                if (s) setSize(s);
              }}
            >
              {SIZES.map((s) => (
                <option key={s.label} value={`${s.w}x${s.h}`}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">批量数量</label>
            <input
              type="number"
              min={1}
              max={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs outline-none"
              value={batchSize}
              onChange={(e) => setBatchSize(Math.min(8, Math.max(1, Number(e.target.value))))}
            />
          </div>
        </div>

        {/* Extras & Negative */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">附加关键词</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
              placeholder="high detail, game asset, transparent PNG"
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">负面词</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
              placeholder="blurry, watermark, text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={
            submitting ||
            !selectedProject ||
            !subject.trim() ||
            (batchMode && batchFiles.length === 0)
          }
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
            submitting ||
              !selectedProject ||
              !subject.trim() ||
              (batchMode && batchFiles.length === 0)
              ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
              : "bg-yellow-500 text-black hover:bg-yellow-400"
          )}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : batchMode ? (
            <Layers className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {submitting
            ? "生成中…"
            : batchMode
              ? `批量生成 (${batchFiles.length} 个素材)`
              : "开始生成"}
        </button>

        {/* Recent tasks mini preview */}
        {tasks.length > 0 && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">最近任务</h3>
              <Link
                href="/tasks"
                className="text-xs text-yellow-500 hover:text-yellow-400"
              >
                查看全部 →
              </Link>
            </div>
            <div className="space-y-2">
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      task.status === "queued" && "bg-zinc-500",
                      task.status === "running" && "bg-blue-400 animate-pulse",
                      task.status === "success" && "bg-green-400",
                      task.status === "failed" && "bg-red-400"
                    )}
                  />
                  <span className="flex-1 truncate text-xs text-zinc-300">
                    {task.prompt}
                  </span>
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
