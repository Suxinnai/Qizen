import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  Library,
  Network,
  NotebookPen,
  Settings,
} from "lucide-react";
import clsx from "clsx";
import { Leaf } from "./icons/Leaf";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "看板", icon: LayoutDashboard },
  { to: "/study", label: "学习空间", icon: GraduationCap },
  { to: "/goals", label: "我的目标", icon: Target },
  { to: "/library", label: "资料库", icon: Library },
  { to: "/graph", label: "知识图谱", icon: Network },
  { to: "/notes", label: "笔记", icon: NotebookPen },
  { to: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="qz-sidebar">
      <div className="flex items-center gap-2 px-2 pt-1 pb-4">
        <Leaf size={26} stroke="#2D7A6B" />
        <span className="font-serif text-[20px] tracking-wide text-qz-primary dark:text-qz-light">
          栖知
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx("qz-nav-item", isActive && "active")
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-3 px-2 py-3 border-t border-black/5 dark:border-white/5">
        <div className="relative">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-medium"
            style={{
              background: "linear-gradient(135deg, #5BA593 0%, #2D7A6B 100%)",
            }}
          >
            沐
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-qz-mastered border border-white dark:border-qz-bg-dark" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">
            沐灵
          </span>
          <span className="text-[11px] text-qz-mastered">在线</span>
        </div>
      </div>
    </aside>
  );
}
