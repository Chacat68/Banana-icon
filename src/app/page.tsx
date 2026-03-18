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
const PROMPT_DRAFT_STORAGE_KEY = "banana-icon.generate.prompt-draft";

interface PromptDraft {
  subject: string;
  style: string;
  background: string;
  extras: string;
  negativePrompt: string;
  sizeKey: string;
  batchSize: number;
  batchMode: boolean;
  selectedProject: string;
}

interface Project {
  id: string;
  name: string;
}

function getSizeKey(size: { w: number; h: number }) {
  return `${size.w}x${size.h}`;
}

function readPromptDraft(): PromptDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROMPT_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PromptDraft>;
    return {
      subject: typeof parsed.subject === "string" ? parsed.subject : "",
      style:
        typeof parsed.style === "string" && parsed.style.trim()
          ? parsed.style
          : STYLE_PRESETS[0].value,
      background:
        typeof parsed.background === "string" && BACKGROUND_OPTIONS.includes(parsed.background)
          ? parsed.background
          : "透明",
      extras: typeof parsed.extras === "string" ? parsed.extras : "",
      negativePrompt: typeof parsed.negativePrompt === "string" ? parsed.negativePrompt : "",
      sizeKey:
        typeof parsed.sizeKey === "string" && SIZES.some((size) => getSizeKey(size) === parsed.sizeKey)
          ? parsed.sizeKey
          : getSizeKey(SIZES[3]),
      batchSize:
        typeof parsed.batchSize === "number"
          ? Math.min(8, Math.max(1, parsed.batchSize))
          : 1,
      batchMode: Boolean(parsed.batchMode),
      selectedProject: typeof parsed.selectedProject === "string" ? parsed.selectedProject : "",
    };
  } catch {
    return null;
  }
}

function writePromptDraft(draft: PromptDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMPT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
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
  const draftReadyRef = useRef(false);

  const pendingCount = useTaskStore(
    (state) =>
      state.tasks.reduce(
        (count, task) =>
          task.status === "queued" || task.status === "running"
            ? count + 1
            : count,
        0
      )
  );

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json() as Promise<Project[]>)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject((current) => {
            if (current && data.some((project) => project.id === current)) {
              return current;
            }
            return data[0].id;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const draft = readPromptDraft();
    if (draft) {
      setSubject(draft.subject);
      setStyle(draft.style);
      setBackground(draft.background);
      setExtras(draft.extras);
      setNegativePrompt(draft.negativePrompt);
      setSize(SIZES.find((size) => getSizeKey(size) === draft.sizeKey) || SIZES[3]);
      setBatchSize(draft.batchSize);
      setBatchMode(draft.batchMode);
      setSelectedProject(draft.selectedProject);
    }

    draftReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;

    writePromptDraft({
      subject,
      style,
      background,
      extras,
      negativePrompt,
      sizeKey: getSizeKey(size),
      batchSize,
      batchMode,
      selectedProject,
    });
  }, [
    subject,
    style,
    background,
    extras,
    negativePrompt,
    size,
    batchSize,
    batchMode,
    selectedProject,
  ]);

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
    useTaskStore.getState().addTask(localTask);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getApiKeyHeaders(),
        },
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
        useTaskStore.getState().updateTask(taskId, { status: "failed", error: data.error || `Server error (${res.status})` });
        return;
      }
      useTaskStore.getState().updateTask(taskId, { id: data.id, status: data.status as TaskStatus });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      useTaskStore.getState().updateTask(taskId, { status: "failed", error: message });
    }
  }, [
    style, background, extras,
    negativePrompt, size, batchSize, selectedProject, referenceImageUrl,
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

  const quickStats = [
    {
      label: "活跃任务",
      value: String(pendingCount),
      note: pendingCount > 0 ? "队列里仍有任务在处理" : "当前没有排队中的生成请求",
    },
    {
      label: "项目数量",
      value: String(projects.length),
      note: projects.length > 0 ? "可以直接切换项目继续出图" : "先创建项目再开始生成",
    },
    {
      label: "当前画布",
      value: `${size.w}×${size.h}`,
      note: batchMode ? "已切到批量修订模式" : "当前是单张生成工作流",
    },
  ];

  const activeProjectName =
    projects.find((project) => project.id === selectedProject)?.name || "未选择项目";

  return (
    <div className="page-shell editor-page">
      <div className="editor-toolbar">
        <div>
          <div className="editor-toolbar-meta">Generator Workspace</div>
          <div className="editor-toolbar-title">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            生成编辑器
          </div>
        </div>
        <div className="editor-toolbar-group">
          <span className="editor-chip">Project: {activeProjectName}</span>
          <span className="editor-chip">Mode: {batchMode ? "Batch" : "Single"}</span>
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
      </div>

      <div className="editor-stat-strip">
        {quickStats.map((item) => (
          <div key={item.label} className="editor-stat">
            <div className="editor-stat-title">{item.label}</div>
            <div className="editor-stat-value font-display">{item.value}</div>
            <div className="editor-stat-note">{item.note}</div>
          </div>
        ))}
        <div className="editor-stat">
          <div className="editor-stat-title">参考图</div>
          <div className="editor-stat-value font-display">{referenceImagePreview ? "1" : "0"}</div>
          <div className="editor-stat-note">风格参考图当前挂载状态</div>
        </div>
      </div>

      <div className="editor-panels editor-panels-home">
        <section className="editor-panel">
          <div className="editor-panel-header">
            <div>
              <div className="editor-panel-subtitle">Session</div>
              <div className="editor-panel-title">工作流设置</div>
            </div>
          </div>
          <div className="editor-panel-body editor-stack">
            <div>
              <label className="editor-block-label">项目</label>
              <div className="flex gap-2">
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
            </div>

            <div>
              <label className="editor-block-label">模式</label>
              <div className="flex items-center gap-2">
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
            </div>

            <div className="editor-three-col">
              <div>
                <label className="editor-block-label">背景</label>
                <select
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs outline-none"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                >
                  {BACKGROUND_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="editor-block-label">尺寸</label>
                <select
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs outline-none"
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
                <label className="editor-block-label">批量数量</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs outline-none"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.min(8, Math.max(1, Number(e.target.value))))}
                />
              </div>
            </div>

            <div className="editor-surface">
              <div className="editor-block-label">当前上下文</div>
              <div className="editor-help">项目 {activeProjectName}，输出尺寸 {size.label}，{batchMode ? `当前将处理 ${batchFiles.length || 0} 个批量素材` : "当前为单张素材生成"}。</div>
            </div>
            <div className="editor-surface">
              <div className="editor-block-label">提示词记忆</div>
              <div className="editor-help">当前页会自动保存提示词草稿；切换到其他标签后返回，输入内容会自动恢复。</div>
            </div>
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-panel-header">
            <div>
              <div className="editor-panel-subtitle">Viewport</div>
              <div className="editor-panel-title">Prompt Composer</div>
            </div>
          </div>
          <div className="editor-panel-body editor-form-grid">
            <div>
              <label className="editor-block-label">素材描述</label>
              <textarea
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm outline-none focus:border-yellow-500"
                rows={5}
                placeholder="例如：一把发光的蓝色魔法剑、一个可爱的史莱姆怪物"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="editor-block-label">风格预设</label>
              <div className="flex flex-wrap gap-2">
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
            </div>

            <div className="editor-two-col">
              <div>
                <label className="editor-block-label">附加关键词</label>
                <input
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                  placeholder="high detail, game asset, transparent PNG"
                  value={extras}
                  onChange={(e) => setExtras(e.target.value)}
                />
              </div>
              <div>
                <label className="editor-block-label">负面词</label>
                <input
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                  placeholder="blurry, watermark, text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="editor-block-label">风格参考图</label>
              <div
          className="mb-2"
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
              <p className="text-[10px] text-zinc-600">上传参考图以提取风格提示词</p>
            </div>

            {batchMode && (
              <div>
                <label className="editor-block-label">批量输入素材</label>
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
                  className="mb-2 w-full rounded-lg border-2 border-dashed border-zinc-700 px-4 py-5 text-sm text-zinc-400 transition-colors hover:border-yellow-500/50 hover:text-zinc-300"
                >
                  <div className="flex items-center justify-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    {batchFiles.length > 0
                      ? `已选择 ${batchFiles.length} 个素材，点击继续添加`
                      : "点击选择素材图片 (PNG, JPG, WebP, GIF)"}
                  </div>
                </button>
                {batchFiles.length > 0 ? (
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
                    <div className="grid grid-cols-4 gap-2">
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
                ) : (
                  <p className="text-xs text-zinc-600">每个素材将作为参考图，使用相同的提示词生成新版本。</p>
                )}
              </div>
            )}

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
          </div>
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-panel-header">
            <div>
              <div className="editor-panel-subtitle">Inspector</div>
              <div className="editor-panel-title">运行状态</div>
            </div>
          </div>
          <div className="editor-panel-body editor-stack">
            <div className="editor-surface">
              <div className="editor-block-label">场景摘要</div>
              <div className="space-y-2 text-sm text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">当前项目</span>
                  <span>{activeProjectName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">输出模式</span>
                  <span>{batchMode ? "批量修订" : "单张生成"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">画布尺寸</span>
                  <span>{size.label}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">参考图</span>
                  <span>{referenceImagePreview ? "已挂载" : "未挂载"}</span>
                </div>
              </div>
            </div>

            <div className="editor-surface">
              <div className="editor-block-label">批处理提示</div>
              <p className="editor-help">批量模式会对每个导入素材套用同一套提示词。如果你要做风格统一，而不是内容重绘，这个区最有用。</p>
            </div>

            <div className="editor-surface">
              <div className="mb-3 flex items-center justify-between">
                <div className="editor-block-label mb-0">最近任务</div>
                <Link href="/tasks" className="text-xs text-yellow-500 hover:text-yellow-400">打开队列</Link>
              </div>
              <RecentTasksPanel />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function areSameTasks(a: TaskItem[], b: TaskItem[]) {
  return a.length === b.length && a.every((task, index) => task === b[index]);
}

function RecentTasksPanel() {
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    const syncRecentTasks = (tasks: TaskItem[]) => {
      const nextRecentTasks = tasks.slice(0, 4);
      setRecentTasks((current) =>
        areSameTasks(current, nextRecentTasks) ? current : nextRecentTasks
      );
    };

    syncRecentTasks(useTaskStore.getState().tasks);

    return useTaskStore.subscribe((state) => {
      syncRecentTasks(state.tasks);
    });
  }, []);

  if (recentTasks.length === 0) {
    return <p className="text-xs text-zinc-500">当前会话还没有任务。</p>;
  }

  return (
    <div className="space-y-2">
      {recentTasks.map((task) => (
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
  );
}
