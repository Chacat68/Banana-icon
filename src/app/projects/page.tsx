"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Plus, ImageIcon, Zap } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { assets: number; tasks: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      setProjects(await res.json() as Project[]);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    const proj = await res.json() as Project;
    setProjects((p) => [{ ...proj, _count: { assets: 0, tasks: 0 } }, ...p]);
    setName("");
    setDescription("");
    setShowForm(false);
  }, [name, description]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-yellow-400" />
          项目管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3">
            <label className="mb-1 block text-xs text-zinc-500">项目名称 *</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的 RPG 游戏"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-zinc-500">描述</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="2D 像素 RPG 游戏的角色和道具素材"
            />
          </div>
          <div className="flex gap-2">
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

      {loading ? (
        <p className="py-10 text-center text-zinc-500">加载中…</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-zinc-500">
          <FolderOpen className="mb-3 h-10 w-10 text-zinc-700" />
          <p>还没有项目，点击右上角新建</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600"
            >
              <h3 className="font-medium">{project.name}</h3>
              {project.description && (
                <p className="mt-1 text-sm text-zinc-400">{project.description}</p>
              )}
              <div className="mt-4 flex gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {project._count.assets} 素材
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  {project._count.tasks} 任务
                </span>
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">
                创建于 {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
