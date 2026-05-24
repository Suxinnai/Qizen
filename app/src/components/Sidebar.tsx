import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  Library,
  Network,
  NotebookPen,
  Settings,
  BarChart3,
  ChevronDown,
  MessagesSquare,
  SquarePen,
} from "lucide-react";
import clsx from "clsx";
import { Leaf } from "./icons/Leaf";
import {
  getActiveStudyConversationId,
  getStudyConversationChangeEventName,
  listStudyConversations,
  setActiveStudyConversationId,
  type PersistedStudyConversation,
} from "../lib/studyConversations";

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

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PersistedStudyConversation[]>(() => listStudyConversations());
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() =>
    getActiveStudyConversationId()
  );
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);

  useEffect(() => {
    const sync = () => {
      setSessions(listStudyConversations());
      setActiveConversationIdState(getActiveStudyConversationId());
    };
    sync();
    window.addEventListener(getStudyConversationChangeEventName(), sync);
    return () => window.removeEventListener(getStudyConversationChangeEventName(), sync);
  }, []);

  const sessionItems = useMemo(() => sessions.slice(0, 30), [sessions]);

  const handleNewSession = () => {
    setActiveStudyConversationId(null);
    setActiveConversationIdState(null);
    window.dispatchEvent(new CustomEvent("qizen-study-start-new"));
    if (location.pathname !== "/study") {
      navigate("/study");
    }
  };

  return (
    <aside className="qz-sidebar">
      {/* 1. Logo 品牌行 (独占一行，坚决防止挤压) */}
      <div className="qz-sidebar-brand-wrapper">
        <div className="qz-sidebar-brand">
          <Leaf size={25} stroke="#2F7D71" />
          <span>栖知</span>
        </div>
      </div>

      {/* 2. 显眼的新建会话黄金入口 (胶囊按钮) */}
      <div className="qz-sidebar-action-zone">
        <button
          type="button"
          onClick={handleNewSession}
          className="qz-btn-new-session"
          title="新建学习会话"
        >
          <SquarePen size={14} />
          <span>新建学习会话</span>
        </button>
      </div>

      {/* 3. 主功能菜单导航 */}
      <nav className="qz-sidebar-nav">
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

      {/* 4. 最近学习会话 (折叠手风琴布局) */}
      <div className="qz-sessions-accordion">
        <button
          type="button"
          onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
          className="qz-sessions-accordion-header"
        >
          <ChevronDown
            size={14}
            className={clsx("transition-transform duration-200 shrink-0", !isSessionsExpanded && "-rotate-90")}
          />
          <MessagesSquare size={14} className="shrink-0" />
          <span className="flex-1 text-left truncate">最近学习会话</span>
          {sessions.length > 0 && <span className="qz-sessions-badge">{sessions.length}</span>}
        </button>

        {isSessionsExpanded ? (
          <div className="qz-session-list">
            {sessionItems.length > 0 ? (
              sessionItems.map((session) => {
                const active = session.id === activeConversationId && location.pathname === "/study";
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveStudyConversationId(session.id);
                      setActiveConversationIdState(session.id);
                      if (location.pathname !== "/study") {
                        navigate("/study");
                      }
                    }}
                    className={clsx(
                      "qz-session-item",
                      active
                        ? "qz-session-item-active"
                        : "text-qz-text-strong dark:text-qz-text-dark"
                    )}
                  >
                    <div className="truncate">{session.title}</div>
                    <div className="mt-0.5 flex items-center justify-end text-[10px] text-qz-text-muted">
                      <span>{formatConversationTime(session.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-4 text-[11px] text-qz-text-muted leading-relaxed text-center">
                暂无会话。发送消息后自动保存。
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 5. 底部沉底区 (个人中心与设置快捷整合) */}
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
