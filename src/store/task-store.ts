import { create } from "zustand";

export type TaskStatus = "queued" | "running" | "success" | "failed";

export interface TaskItem {
  id: string;
  prompt: string;
  status: TaskStatus;
  imageUrls: string[];
  error?: string;
  createdAt: string;
}

interface TaskStore {
  tasks: TaskItem[];
  addTask: (task: TaskItem) => void;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));
