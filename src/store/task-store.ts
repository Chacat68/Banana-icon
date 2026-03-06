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

function hasTaskChanges(task: TaskItem, patch: Partial<TaskItem>) {
  return Object.entries(patch).some(([key, value]) => {
    const currentValue = task[key as keyof TaskItem];

    if (Array.isArray(currentValue) && Array.isArray(value)) {
      return currentValue.length !== value.length || currentValue.some((item, index) => item !== value[index]);
    }

    return currentValue !== value;
  });
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, patch) =>
    set((s) => {
      let changed = false;
      const tasks = s.tasks.map((t) => {
        if (t.id !== id || !hasTaskChanges(t, patch)) {
          return t;
        }

        changed = true;
        return { ...t, ...patch };
      });

      return changed ? { tasks } : s;
    }),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));
