import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "看板",
  "/study": "学习空间",
  "/goals": "我的目标",
  "/library": "资料库",
  "/graph": "知识图谱",
  "/notes": "笔记",
  "/reports": "学习报告",
  "/profile": "个人中心",
  "/settings": "设置",
};

export function Layout() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "看板";

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  return (
    <div className="qz-window">
      <Sidebar />

      <div className="qz-shell">
        <TitleBar
          title={title}
          isDark={isDark}
          onToggleTheme={() => setIsDark((v) => !v)}
        />

        <main className="qz-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
