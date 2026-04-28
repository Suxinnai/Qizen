import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  Library,
  Network,
  NotebookPen,
  Settings,
  UserRound,
  BarChart3,
  PanelLeft,
  MessagesSquare,
  Plus,
} from "lucide-react";
import clsx from "clsx";
import { Leaf } from "./icons/Leaf";
import {
  getActiveStudyConversationId,
  getStudyConversationChangeEventName,
  getStudySidebarMode,
  listStudyConversations,
  setActiveStudyConversationId,
  setStudySidebarMode,
  type PersistedStudyConversation,
  type StudySidebarMode,
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
  { to: "/profile", label: "个人中心", icon: UserRound },
  { to: "/settings", label: "设置", icon: Settings },
];

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function Sidebar() {
  const location = useLocation();
  const isStudyPage = location.pathname === "/study";
  const [mode, setMode] = useState<StudySidebarMode>(() => getStudySidebarMode());
  const [sessions, setSessions] = useState<PersistedStudyConversation[]>(() => listStudyConversations());
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() =>
    getActiveStudyConversationId()
  );

  useEffect(() => {
    const sync = () => {
      setMode(getStudySidebarMode());
      setSessions(listStudyConversations());
      setActiveConversationIdState(getActiveStudyConversationId());
    };
    sync();
    window.addEventListener(getStudyConversationChangeEventName(), sync);
    return () => window.removeEventListener(getStudyConversationChangeEventName(), sync);
  }, []);

  const shouldShowSessions = isStudyPage && mode === "sessions";
  const headerTitle = shouldShowSessions ? "会话" : "栖知";
  const headerIcon = shouldShowSessions ? <MessagesSquare size={18} /> : <Leaf size={26} stroke="#2D7A6B" />;

  const sessionItems = useMemo(() => sessions.slice(0, 30), [sessions]);

  return (
    <aside className="qz-sidebar">
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          {headerIcon}
          <span className="font-serif text-[20px] tracking-wide text-qz-primary dark:text-qz-light truncate">
            {headerTitle}
          </span>
        </div>
        {isStudyPage ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const next = mode === "menu" ? "sessions" : "menu";
                setMode(next);
                setStudySidebarMode(next);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-qz-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={mode === "menu" ? "切换到会话列表" : "切换到主菜单"}
            >
              {mode === "menu" ? <MessagesSquare size={16} /> : <PanelLeft size={16} />}
            </button>
            {shouldShowSessions ? (
              <button
                type="button"
                onClick={() => {
                  setActiveStudyConversationId(null);
                  window.dispatchEvent(new CustomEvent("qizen-study-start-new"));
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-qz-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="新建会话"
              >
                <Plus size={16} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {shouldShowSessions ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-2 pb-2 text-[11px] text-qz-text-muted">最近学习会话</div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sessionItems.length > 0 ? (
              sessionItems.map((session) => {
                const active = session.id === activeConversationId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveStudyConversationId(session.id);
                      setActiveConversationIdState(session.id);
                    }}
                    className={clsx(
                      "w-full text-left rounded-[14px] px-3 py-2.5 transition-colors",
                      active
                        ? "bg-qz-primary/8 text-qz-primary"
                        : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-qz-text-strong dark:text-qz-text-dark"
                    )}
                  >
                    <div className="truncate text-[13px] font-medium">{session.title}</div>
                    <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-qz-text-muted">
                      <span className="shrink-0">{formatConversationTime(session.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-[12px] text-qz-text-muted leading-6">
                还没有历史会话。点右上角加号，或者在学习空间里直接新建一个。
              </div>
            )}
          </div>
        </div>
      ) : (
        <nav className="flex flex-col gap-1">
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
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-3 px-2 py-3 border-t border-black/5 dark:border-white/5">
        <div className="relative">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-medium"
            style={{ background: "linear-gradient(135deg, #5BA593 0%, #2D7A6B 100%)" }}
          >
            沐
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-qz-mastered border border-white dark:border-qz-bg-dark" />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[13px] text-qz-text-strong dark:text-qz-text-dark truncate">沐灵</span>
          <span className="text-[11px] text-qz-mastered">在线</span>
        </div>
      </div>
    </aside>
  );
}
