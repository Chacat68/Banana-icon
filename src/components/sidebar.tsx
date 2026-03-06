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
    <aside className="app-sidebar flex flex-col">
      <div className="sidebar-brand">
        <div className="brand-badge">
          <span className="text-base">🍌</span>
          Editor Workspace
        </div>
        <div>
          <p className="brand-heading font-display">Banana Icon</p>
          <p className="brand-copy">
	          项目、任务和素材在同一套编辑器面板里协同管理。
          </p>
        </div>
      </div>

      <p className="side-kicker">Panels</p>

      <nav className="nav-stack flex-1">
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
                "nav-pill text-sm",
                active ? "nav-pill-active" : ""
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-label">Engine</div>
        <div className="sidebar-footer-value">Nano Banana Runtime</div>
        <p className="sidebar-footer-copy">
	        深色分区和低干扰强调色，更接近游戏编辑器的控制台视图。
        </p>
      </div>
    </aside>
  );
}
