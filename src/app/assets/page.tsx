"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ImageIcon,
  Download,
  Trash2,
  Search,
  Tag,
  Upload,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  filename: string;
  originalUrl: string;
  processedUrl: string | null;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  prompt: string;
  seed: number | null;
  tags: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

type ImportStatus = "idle" | "uploading" | "done";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Batch import state
  const [showImport, setShowImport] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importTags, setImportTags] = useState("");
  const [importPrompt, setImportPrompt] = useState("");
  const [importProjectId, setImportProjectId] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: { filename: string; error: string }[];
    total: number;
  } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assets");
      setAssets((await res.json()) as Asset[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = (await res.json()) as Project[];
      setProjects(data);
      if (data.length > 0) {
        setImportProjectId((prev) => prev || data[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const deleteAsset = useCallback(
    async (id: string) => {
      await fetch(`/api/assets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setAssets((a) => a.filter((x) => x.id !== id));
      if (selectedAsset?.id === id) setSelectedAsset(null);
    },
    [selectedAsset]
  );

  const openImportDialog = useCallback(() => {
    setShowImport(true);
    setImportFiles([]);
    setImportTags("");
    setImportPrompt("");
    setImportStatus("idle");
    setImportResult(null);
    loadProjects();
  }, [loadProjects]);

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setImportFiles(Array.from(e.target.files));
      }
    },
    []
  );

  const removeImportFile = useCallback((index: number) => {
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBatchImport = useCallback(async () => {
    if (importFiles.length === 0 || !importProjectId) return;
    setImportStatus("uploading");
    setImportResult(null);

    const formData = new FormData();
    for (const file of importFiles) {
      formData.append("files", file);
    }
    formData.append("projectId", importProjectId);
    if (importTags.trim()) formData.append("tags", importTags.trim());
    if (importPrompt.trim()) formData.append("prompt", importPrompt.trim());

    try {
      const res = await fetch("/api/assets/batch", {
        method: "POST",
        body: formData,
      });
      const result = (await res.json()) as {
        created: number;
        errors: { filename: string; error: string }[];
        total: number;
      };
      setImportResult(result);
      setImportStatus("done");
      if (result.created > 0) {
        loadAssets();
      }
    } catch {
      setImportResult({ created: 0, errors: [{ filename: "-", error: "Network error" }], total: importFiles.length });
      setImportStatus("done");
    }
  }, [importFiles, importProjectId, importTags, importPrompt, loadAssets]);

  const filtered = assets.filter(
    (a) =>
      a.prompt.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags && a.tags.toLowerCase().includes(search.toLowerCase()))
  );

  const taggedCount = assets.filter((asset) => Boolean(asset.tags?.trim())).length;
  const readyCount = assets.filter((asset) => Boolean(asset.processedUrl || asset.originalUrl)).length;

  return (
    <div className="page-shell page-shell-wide">
      {/* Batch Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="h-5 w-5 text-yellow-400" />
                批量导入
              </h2>
              <button
                onClick={() => setShowImport(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importStatus === "done" && importResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span>
                    成功导入 {importResult.created}/{importResult.total} 个文件
                  </span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-red-800/50 bg-red-900/20 p-3">
                    <p className="mb-1 text-xs font-medium text-red-400">
                      失败文件:
                    </p>
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-300">
                        {e.filename}: {e.error}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowImport(false)}
                  className="w-full rounded-lg bg-yellow-500 py-2 text-sm font-medium text-black hover:bg-yellow-400"
                >
                  关闭
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project selector */}
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    目标项目 *
                  </label>
                  <select
                    value={importProjectId}
                    onChange={(e) => setImportProjectId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {projects.length === 0 && (
                    <p className="mt-1 text-xs text-red-400">
                      请先创建一个项目
                    </p>
                  )}
                </div>

                {/* File picker */}
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    选择图片文件
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-zinc-700 px-4 py-6 text-sm text-zinc-400 transition-colors hover:border-yellow-500/50 hover:text-zinc-300"
                  >
                    {importFiles.length > 0
                      ? `已选择 ${importFiles.length} 个文件`
                      : "点击选择文件 (PNG, JPG, WebP, GIF)"}
                  </button>
                </div>

                {/* Selected files list */}
                {importFiles.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 p-2">
                    {importFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 text-xs"
                      >
                        <span className="truncate text-zinc-300">
                          {f.name}
                        </span>
                        <button
                          onClick={() => removeImportFile(i)}
                          className="ml-2 shrink-0 text-zinc-500 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Common tags */}
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    标签 (逗号分隔)
                  </label>
                  <input
                    value={importTags}
                    onChange={(e) => setImportTags(e.target.value)}
                    placeholder="icon, ui, flat…"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Common prompt */}
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Prompt 描述
                  </label>
                  <input
                    value={importPrompt}
                    onChange={(e) => setImportPrompt(e.target.value)}
                    placeholder="imported asset"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImport(false)}
                    className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleBatchImport}
                    disabled={
                      importFiles.length === 0 ||
                      !importProjectId ||
                      importStatus === "uploading"
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-500 py-2 text-sm font-medium text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importStatus === "uploading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        导入中…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        开始导入 ({importFiles.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="content-grid">
        <div className="hero-banner">
          <div>
            <p className="hero-kicker">Asset Library</p>
            <h1 className="hero-title font-display">把素材库从缩略图墙改成可检索、可筛看的资产架。</h1>
            <p className="hero-copy">
              左侧专注于浏览和筛选，右侧专注于单个素材的上下文。这样你能更快判断一个素材来自什么提示词、是否值得继续复用，以及它在库里的状态。
            </p>
          </div>
          <div className="mini-stat-grid">
            <div className="mini-stat">
              <div className="mini-stat-label">库中总数</div>
              <div className="mini-stat-value font-display">{assets.length}</div>
              <div className="mini-stat-note">已导入或生成的全部素材</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">当前结果</div>
              <div className="mini-stat-value font-display">{filtered.length}</div>
              <div className="mini-stat-note">符合搜索条件的资产</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">已打标签</div>
              <div className="mini-stat-value font-display">{taggedCount}</div>
              <div className="mini-stat-note">可继续做二次归档的素材</div>
            </div>
          </div>
        </div>

        <div className="split-layout">
          <div className="section-panel">
            <div className="section-panel-inner">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ImageIcon className="h-5 w-5 text-yellow-400" />
            资产库
          </h1>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-yellow-500"
              placeholder="搜索 prompt 或标签…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openImportDialog}
            className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400"
          >
            <Upload className="h-4 w-4" />
            批量导入
          </button>
          <span className="text-sm text-zinc-500">{readyCount} 项可预览</span>
        </div>

        {loading ? (
          <p className="py-20 text-center text-zinc-500">加载中…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-zinc-500">
            <ImageIcon className="mb-3 h-10 w-10 text-zinc-700" />
            <p>暂无素材</p>
          </div>
        ) : (
          <div className="asset-grid">
            {filtered.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "asset-tile group relative text-left",
                  selectedAsset?.id === asset.id
                    ? "asset-tile-active"
                    : ""
                )}
              >
                <div className="aspect-square bg-zinc-800">
                  <img
                    src={asset.processedUrl || asset.originalUrl}
                    alt={asset.prompt}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-10 text-xs text-zinc-400">{asset.prompt}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600">
                    <span>
                    {asset.width}×{asset.height}
                    </span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
            </div>
          </div>

          <div className="section-panel detail-panel">
            <div className="section-panel-inner">
      {selectedAsset ? (
        <>
          <div className="mb-4 aspect-square overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
            <img
              src={selectedAsset.processedUrl || selectedAsset.originalUrl}
              alt={selectedAsset.prompt}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="mb-3">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前选中</div>
            <h3 className="mt-2 text-lg font-semibold">素材详情</h3>
          </div>

          <h3 className="mb-1 text-sm font-medium">Prompt</h3>
          <p className="mb-3 text-xs text-zinc-400">{selectedAsset.prompt}</p>

          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-zinc-500">尺寸</span>
              <p>{selectedAsset.width}×{selectedAsset.height}</p>
            </div>
            <div>
              <span className="text-zinc-500">Seed</span>
              <p>{selectedAsset.seed ?? "—"}</p>
            </div>
            <div>
              <span className="text-zinc-500">创建时间</span>
              <p>{new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {selectedAsset.tags && (
            <div className="mb-4">
              <h4 className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
                <Tag className="h-3 w-3" /> 标签
              </h4>
              <div className="flex flex-wrap gap-1">
                {selectedAsset.tags.split(",").map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <a
              href={selectedAsset.originalUrl}
              download={selectedAsset.filename}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-yellow-500 py-2 text-xs font-medium text-black hover:bg-yellow-400"
            >
              <Download className="h-3.5 w-3.5" /> 下载
            </a>
            <button
              onClick={() => deleteAsset(selectedAsset.id)}
              className="flex items-center justify-center gap-1 rounded-lg border border-red-800 px-3 py-2 text-xs text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-96 flex-col items-center justify-center text-center text-zinc-500">
          <ImageIcon className="mb-4 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-400">从左侧选择一个素材查看详情。</p>
          <p className="mt-2 max-w-xs text-xs text-zinc-500">详情面板会显示提示词、标签、尺寸和操作按钮，方便你继续整理资产库。</p>
        </div>
      )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
