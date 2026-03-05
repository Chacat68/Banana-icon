"use client";

import { useState, useEffect, useCallback } from "react";
import { Palette, Plus, Trash2, ImagePlus, X, Loader2, Sparkles } from "lucide-react";
import { cn, getApiKeyHeaders } from "@/lib/utils";

interface StyleProfile {
  id: string;
  name: string;
  description: string | null;
  style: string;
  keywords: string;
  negativeWords: string | null;
  referenceImageUrl: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function StylesPage() {
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [negativeWords, setNegativeWords] = useState("");
  const [projectId, setProjectId] = useState("");
  const [refImageUrl, setRefImageUrl] = useState("");
  const [refImagePreview, setRefImagePreview] = useState("");
  const [uploadingRef, setUploadingRef] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stylesRes, projRes] = await Promise.all([
        fetch("/api/styles"),
        fetch("/api/projects"),
      ]);
      setProfiles(await stylesRes.json() as StyleProfile[]);
      const projs = await projRes.json() as Project[];
      setProjects(projs);
      if (projs.length > 0) {
        setProjectId((prev) => prev || projs[0].id);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingRef(true);
    setRefImagePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url: string };
      if (res.ok) setRefImageUrl(data.url);
      else setRefImagePreview("");
    } catch {
      setRefImagePreview("");
    } finally {
      setUploadingRef(false);
    }
  }, []);

  const clearRefImage = useCallback(() => {
    setRefImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setRefImageUrl("");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!refImageUrl) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/styles/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getApiKeyHeaders() },
        body: JSON.stringify({ imageUrl: refImageUrl }),
      });
      const data = (await res.json()) as {
        style?: string;
        keywords?: string;
        negativeWords?: string;
        description?: string;
        error?: string;
      };
      if (!res.ok) {
        setAnalyzeError(data.error || "识别失败");
        return;
      }
      if (data.style) setStyle(data.style);
      if (data.keywords) setKeywords(data.keywords);
      if (data.negativeWords) setNegativeWords(data.negativeWords);
      if (data.description) setDescription(data.description);
    } catch {
      setAnalyzeError("网络错误，识别失败");
    } finally {
      setAnalyzing(false);
    }
  }, [refImageUrl]);

  const handleCreate = useCallback(async () => {
    if (!name || !style || !keywords || !projectId) return;
    const res = await fetch("/api/styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, style, keywords, negativeWords, projectId, referenceImageUrl: refImageUrl || undefined }),
    });
    const profile = await res.json() as StyleProfile;
    setProfiles((p) => [profile, ...p]);
    setName(""); setDescription(""); setStyle(""); setKeywords(""); setNegativeWords("");
    setRefImageUrl(""); setRefImagePreview("");
    setShowForm(false);
  }, [name, description, style, keywords, negativeWords, projectId, refImageUrl]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5 text-yellow-400" />
          风格模板
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400"
        >
          <Plus className="h-4 w-4" />
          新建风格
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-sm font-medium">创建风格模板</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">名称 *</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：像素风 RPG"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">风格 *</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="pixel-art / cartoon / realistic"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-zinc-500">正面关键词 *</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="pixel art, 16-bit, vibrant colors"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-zinc-500">负面关键词</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                value={negativeWords}
                onChange={(e) => setNegativeWords(e.target.value)}
                placeholder="blurry, watermark, text"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-zinc-500">描述</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="RPG 游戏角色和道具的统一风格"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-zinc-500">风格参考图</label>
              {refImagePreview ? (
                <div className="flex items-start gap-3">
                  <div className="relative inline-block">
                    <img
                      src={refImagePreview}
                      alt="参考图"
                      className="h-24 w-24 rounded-lg border border-zinc-700 object-cover"
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
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleAnalyze}
                      disabled={!refImageUrl || uploadingRef || analyzing}
                      className="flex items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {analyzing ? "识别中…" : "AI 识别生成提示词"}
                    </button>
                    <p className="text-[10px] text-zinc-500">上传参考图后点击识别，自动填充风格和关键词</p>
                    {analyzeError && (
                      <p className="text-[10px] text-red-400">{analyzeError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <label className="flex h-20 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-yellow-500 hover:text-yellow-400">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs">上传参考图</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleRefUpload(f);
                    }}
                  />
                </label>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">所属项目</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400"
            >
              创建
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Profile list */}
      {loading ? (
        <p className="py-10 text-center text-zinc-500">加载中…</p>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-zinc-500">
          <Palette className="mb-3 h-10 w-10 text-zinc-700" />
          <p>还没有风格模板</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  {profile.referenceImageUrl && (
                    <img
                      src={profile.referenceImageUrl}
                      alt="参考图"
                      className="h-14 w-14 shrink-0 rounded-lg border border-zinc-700 object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{profile.name}</h3>
                    {profile.description && (
                      <p className="mt-0.5 text-sm text-zinc-400">{profile.description}</p>
                    )}
                  </div>
                </div>
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                  {profile.style}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {profile.keywords.split(",").map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400"
                  >
                    {k.trim()}
                  </span>
                ))}
              </div>
              {profile.negativeWords && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.negativeWords.split(",").map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400"
                    >
                      −{k.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
