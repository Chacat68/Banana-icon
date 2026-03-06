"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FolderKanban, ImageIcon, Palette, Settings2, Sparkles, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Generator", icon: Sparkles },
  { href: "/tasks", label: "Tasks", icon: Workflow },
  { href: "/assets", label: "Content", icon: ImageIcon },
  { href: "/styles", label: "Styles", icon: Palette },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function EditorChrome() {
  const pathname = usePathname();
  const activeTab = tabs.find((tab) => (tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)));

  return (
    <>
      <div className="editor-chrome">
        <div className="editor-chrome-left">
          <div className="editor-app-mark">
            <Boxes className="h-4 w-4" />
            Banana Icon Editor
          </div>
          <div className="editor-route-label">{activeTab?.label ?? "Workspace"}</div>
        </div>

        <div className="editor-tabbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn("editor-tab", active && "editor-tab-active")}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="editor-chrome-right">
          <span className="editor-chip">Viewport 1</span>
          <span className="editor-chip">Live Session</span>
        </div>
      </div>

      <div className="editor-statusbar">
        <span>Mode: Edit</span>
        <span>Renderer: Nano Banana</span>
        <span>Workspace: Local</span>
      </div>
    </>
  );
}