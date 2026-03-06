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
    if (!res.ok) return;
    const proj = await res.json() as Project;
    setProjects((p) => [{ ...proj, _count: { assets: 0, tasks: 0 } }, ...p]);
    setName("");
    setDescription("");
    setShowForm(false);
  }, [name, description]);

  const totalAssets = projects.reduce((sum, project) => sum + project._count.assets, 0);
  const totalTasks = projects.reduce((sum, project) => sum + project._count.tasks, 0);

  return (
    <div className="page-shell page-shell-wide">
      <div className="content-grid">
        <div className="hero-banner">
          <div>
            <p className="hero-kicker">Project Registry</p>
            <h1 className="hero-title font-display">把项目从孤立名字，变成带上下文的生产单元。</h1>
            <p className="hero-copy">
              项目页现在更像项目注册表。你能快速看到每个项目累计了多少素材和任务，也更容易判断哪些项目值得继续维护，哪些只是临时实验。
            </p>
          </div>
          <div className="mini-stat-grid">
            <div className="mini-stat">
              <div className="mini-stat-label">项目总数</div>
              <div className="mini-stat-value font-display">{projects.length}</div>
              <div className="mini-stat-note">已登记的创作空间</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">累计素材</div>
              <div className="mini-stat-value font-display">{totalAssets}</div>
              <div className="mini-stat-note">所有项目下沉淀的资产数量</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">累计任务</div>
              <div className="mini-stat-value font-display">{totalTasks}</div>
              <div className="mini-stat-note">所有项目发起过的生成任务</div>
            </div>
          </div>
        </div>

        <div className="section-panel">
          <div className="section-panel-inner">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <FolderOpen className="h-5 w-5 text-yellow-400" />
                  项目管理
                </h2>
                <p className="mt-1 text-sm text-zinc-400">每个项目都承接一组资产、风格和生成任务。</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-400"
              >
                <Plus className="h-4 w-4" />
                {showForm ? "收起表单" : "新建项目"}
              </button>
            </div>

            {showForm && (
              <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
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
              <div className="grid gap-4 lg:grid-cols-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-zinc-200">{project.name}</h3>
                        {project.description ? (
                          <p className="mt-1 text-sm text-zinc-400">{project.description}</p>
                        ) : (
                          <p className="mt-1 text-sm text-zinc-500">暂无描述，适合作为临时探索项目。</p>
                        )}
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-3">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Assets</div>
                        <div className="mt-2 flex items-center gap-2 text-zinc-300">
                          <ImageIcon className="h-4 w-4 text-yellow-400" />
                          <span className="text-lg font-semibold">{project._count.assets}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-3">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Tasks</div>
                        <div className="mt-2 flex items-center gap-2 text-zinc-300">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-lg font-semibold">{project._count.tasks}</span>
                        </div>
                      </div>
                    </div>

                    <div className="meta-row mt-4">
                      <span className="meta-chip">项目已创建</span>
                      <span className="meta-chip">适合挂载风格模板与资产库</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
