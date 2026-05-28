import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  Library,
  Network,
  NotebookPen,
  Settings,
  BarChart3
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
  { to: "/reports", label: "学习报告", icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="qz-sidebar select-none">
      {/* 1. Logo 品牌行 (独占一行，坚决防止挤压) */}
      <div className="qz-sidebar-brand-wrapper">
        <div className="qz-sidebar-brand">
          <Leaf size={25} stroke="#2F7D71" />
          <span>栖知</span>
        </div>
      </div>

      {/* 2. 主功能菜单导航 */}
      <nav className="qz-sidebar-nav mt-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx("qz-nav-item", isActive && "active")}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* 3. 底部沉底区 (个人中心与设置快捷整合) */}
      <div className="qz-sidebar-footer">
        <div className="qz-sidebar-user-block">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              clsx("qz-sidebar-user-info-link", isActive && "active")
            }
            title="个人中心"
          >
            <div className="relative shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                style={{ background: "linear-gradient(135deg, #5BA593 0%, #2D7A6B 100%)" }}
              >
                沐
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-qz-mastered border border-white dark:border-qz-bg-dark" />
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-[12.5px] font-semibold text-qz-text-strong dark:text-qz-text-dark truncate">沐灵</span>
              <span className="text-[10px] text-qz-mastered font-medium">在线</span>
            </div>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              clsx("qz-btn-footer-settings", isActive && "active")
            }
            title="设置"
          >
            <Settings size={15} />
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
