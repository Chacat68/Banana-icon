"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ImageIcon, Palette, FolderOpen, ListTodo, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "生成", icon: Sparkles },
  { href: "/tasks", label: "生成任务", icon: ListTodo },
  { href: "/assets", label: "资产库", icon: ImageIcon },
  { href: "/styles", label: "风格模板", icon: Palette },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <span className="text-xl">🍌</span>
        <span className="font-semibold tracking-tight">Banana Icon</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-4 text-xs text-zinc-500">
        Powered by Nano Banana
      </div>
    </aside>
  );
}
