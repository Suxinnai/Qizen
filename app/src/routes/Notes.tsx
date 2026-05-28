import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { 
  Copy, 
  Download, 
  Sparkles,
  BookOpen, 
  Edit2, 
  CheckCircle2, 
  AlertCircle,
  Columns,
  Maximize2,
  Minimize2,
  Brain,
  FileText,
  Clock
} from "lucide-react";
import clsx from "clsx";
import { loadAppData, updateNote } from "../lib/storage";

// A beautiful lightweight Markdown Renderer
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  
  return (
    <div className="font-serif leading-relaxed text-[15px] space-y-4 text-qz-text dark:text-qz-text-dark select-text selection:bg-qz-primary/10">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Horizontal Line: ---
        if (trimmed === "---") {
          return (
            <div key={idx} className="py-4">
              <div className="border-t border-black/[0.06] dark:border-white/[0.08]" />
            </div>
          );
        }

        // Header 1: # Header
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={idx} className="font-serif text-[26px] font-bold text-qz-text-strong dark:text-qz-text-dark border-b border-qz-divider dark:border-qz-divider-dark pb-2.5 mt-6 mb-4 leading-tight">
              {trimmed.slice(2)}
            </h3>
          );
        }
        
        // Header 2: ## Header
        if (trimmed.startsWith("## ")) {
          return (
            <h4 key={idx} className="font-serif text-[20px] font-bold text-qz-text-strong dark:text-qz-text-dark mt-5 mb-3 leading-tight">
              {trimmed.slice(3)}
            </h4>
          );
        }
        
        // Blockquote: > text
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-4 border-qz-primary bg-qz-primary/[0.03] dark:bg-qz-primary/[0.06] rounded-r-lg px-4 py-3.5 italic text-[14.5px] leading-relaxed text-[#1A5C4A] dark:text-[#5BA593] my-4 shadow-[inset_1px_0_0_rgba(0,0,0,0.01)]">
              {trimmed.slice(2)}
            </blockquote>
          );
        }
        
        // Bullet lists: - item or * item
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 text-[14px] leading-7 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-qz-primary/60 dark:bg-qz-light/60 shrink-0 mt-2.5" />
              <span className="text-qz-text dark:text-qz-text-dark">{trimmed.slice(2)}</span>
            </div>
          );
        }
        
        // Empty space
        if (trimmed === "") {
          return <div key={idx} className="h-1.5" />;
        }
        
        // Plain text paragraph
        return (
          <p key={idx} className="leading-7 font-sans text-[14.5px] text-qz-text dark:text-qz-text-dark">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function Notes() {
  const initialData = useMemo(() => loadAppData(), []);
  const [notes, setNotes] = useState(initialData.notes);
  const [selectedId, setSelectedId] = useState(initialData.notes[0]?.id ?? "");
  const [isEditing, setIsEditing] = useState(false); // Default to Preview Mode

  // Collapsible Layout Toggles
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];

  function handleContentChange(content: string) {
    if (!selected) return;
    const next = notes.map((note) =>
      note.id === selected.id
        ? { ...note, content, updatedAt: new Date().toISOString() }
        : note
    );
    setNotes(next);
    updateNote(selected.id, content);
  }

  // Format the updated timestamp beautifully: MM/DD HH:mm
  const updatedDate = useMemo(() => {
    if (!selected?.updatedAt) return "刚刚";
    try {
      const date = new Date(selected.updatedAt);
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${m}/${d} ${h}:${min}`;
    } catch {
      return "刚刚";
    }
  }, [selected?.updatedAt]);

  // Handle Markdown Insertion at Cursor
  function insertMarkdown(syntax: string, wrap = false) {
    const textarea = document.getElementById("note-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    if (wrap) {
      replacement = `${syntax}${selectedText}${syntax}`;
    } else {
      replacement = `${syntax}${selectedText}`;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleContentChange(newContent);

    // Maintain focus and set selection range
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  }

  // Calculate clean text character count (excluding spaces)
  const charCount = useMemo(() => {
    if (!selected?.content) return 0;
    return selected.content.replace(/\s/g, "").length;
  }, [selected?.content]);

  // Calculate estimated reading time
  const readingTime = useMemo(() => {
    return Math.max(Math.ceil(charCount / 400), 1);
  }, [charCount]);

  return (
    <div className="h-full overflow-hidden bg-qz-bg dark:bg-qz-bg-dark transition-colors duration-200">
      <div className="h-full flex min-h-0 w-full">
        
        {/* Left Aside: Notes Directory Sidebar */}
        <aside 
          className={clsx(
            "border-r border-qz-divider dark:border-qz-divider-dark overflow-y-auto bg-white/30 dark:bg-black/5 transition-all duration-300 flex flex-col flex-shrink-0 relative",
            isLeftCollapsed ? "w-0 p-0 overflow-hidden opacity-0 border-r-0" : "w-[210px] p-5 opacity-100"
          )}
        >
          <div className="font-serif text-[24px] text-qz-primary dark:text-qz-light font-bold mb-5 tracking-wide">笔记</div>
          <div className="space-y-2">
            {notes.map((note) => {
              const active = selectedId === note.id;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(note.id);
                    setIsEditing(false); // Snap back to preview when switching notes
                  }}
                  className={clsx(
                    "w-full text-left rounded-qz px-4 py-3.5 border transition-all duration-300 relative group",
                    active
                      ? "bg-[#E2F1EC]/40 dark:bg-[rgba(45,122,107,0.12)] border-qz-primary/20 text-[#1A5C4A] dark:text-[#5BA593] font-semibold shadow-sm"
                      : "bg-transparent border-transparent text-qz-text dark:text-qz-text-dark hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  )}
                >
                  {/* Left indicator border */}
                  {active && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-qz-primary" />
                  )}
                  <div className={clsx(
                    "text-[13px] font-semibold truncate",
                    active ? "text-qz-primary dark:text-qz-light" : "text-qz-text-strong dark:text-qz-text-dark group-hover:text-qz-primary dark:group-hover:text-qz-light transition-colors"
                  )}>
                    {note.title}
                  </div>
                  <div className="text-[11px] text-qz-text-muted mt-1 font-medium">{note.topic}</div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="overflow-y-auto p-6 md:p-8 bg-white dark:bg-qz-card-dark/20 flex-1 flex flex-col min-h-0 transition-all duration-300">
          {selected ? (
            <div className="w-full flex-1 flex flex-col min-h-0">
              
              {/* Integrated Header Row (Title, Toggles & Action Buttons) */}
              <div 
                className={clsx(
                  "flex flex-col md:flex-row md:items-start justify-between gap-5 border-b border-qz-divider dark:border-qz-divider-dark pb-4.5 mb-5 shrink-0 transition-all duration-300 w-full select-none",
                  isFocusMode ? "max-w-[820px] mx-auto" : "max-w-none"
                )}
              >
                {/* Left Side: Title & Subtitle metadata */}
                <div className="min-w-0 flex-1">
                  <h1 className="font-serif text-[28px] md:text-[32px] text-qz-text-strong dark:text-qz-text-dark font-bold tracking-tight leading-tight truncate">
                    {selected.title}
                  </h1>
                  <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-qz-primary/10 dark:bg-qz-primary/20 text-qz-primary text-[10px] font-bold tracking-wide">
                      {selected.topic}
                    </span>
                    <span className="text-qz-text-muted/40">•</span>
                    <div className="text-[12.5px] text-qz-text-muted font-medium flex items-center gap-1">
                      <Clock size={11} className="text-qz-text-muted/60" />
                      <span>更新于 {updatedDate}</span>
                    </div>
                    <span className="font-serif italic text-[12.5px] text-qz-text-muted hidden sm:inline">手抄一遍，胜读十遍</span>
                  </div>
                </div>

                {/* Right Side: Simplified micro-actions in a beautiful, neat row */}
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {/* Left directory collapsible button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setIsLeftCollapsed(!isLeftCollapsed);
                      if (isFocusMode) setIsFocusMode(false);
                    }}
                    className={clsx(
                      "w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)]",
                      isLeftCollapsed 
                        ? "bg-qz-primary/10 border-qz-primary/20 text-qz-primary" 
                        : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/5 text-qz-text-muted hover:text-qz-primary hover:border-qz-primary/20"
                    )}
                    title={isLeftCollapsed ? "展开左侧目录" : "折叠左侧目录"}
                  >
                    <Columns size={13.5} />
                  </motion.button>

                  <div className="w-[1px] h-4 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />

                  {/* Minimalist Export / Download button (matches the others perfectly) */}
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selected.content);
                      alert("已将笔记 Markdown 全文复制到剪贴板！");
                    }}
                    className="w-8 h-8 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-800 text-qz-text-muted hover:text-qz-primary hover:border-qz-primary/20 flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200"
                    title="复制 Markdown 全文"
                  >
                    <Download size={13.5} />
                  </motion.button>

                  <div className="w-[1px] h-4 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />

                  {/* Right AI Sidebar collapsible button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setIsRightCollapsed(!isRightCollapsed);
                      if (isFocusMode) setIsFocusMode(false);
                    }}
                    className={clsx(
                      "w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)]",
                      isRightCollapsed 
                        ? "bg-qz-primary/10 border-qz-primary/20 text-qz-primary" 
                        : "bg-white dark:bg-zinc-800 border-black/5 dark:border-white/5 text-qz-text-muted hover:text-qz-primary hover:border-qz-primary/20"
                    )}
                    title={isRightCollapsed ? "展开 AI 重点" : "折叠 AI 重点"}
                  >
                    <Brain size={13.5} />
                  </motion.button>
                </div>
              </div>

              {/* Note view container with Segmented Switch */}
              <div 
                className={clsx(
                  "flex-1 flex flex-col min-h-0 qz-card !p-6 relative shadow-[0_2px_12px_rgba(0,0,0,0.01)] border border-black/5 dark:border-white/5 bg-white dark:bg-qz-card-dark overflow-hidden transition-all duration-300 w-full",
                  isFocusMode ? "max-w-[820px] mx-auto" : "max-w-none"
                )}
              >
                
                {/* Preview/Edit Toggle Tab & Focus mode */}
                <div className="absolute right-6 top-5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-black/5 dark:border-white/5 p-0.5 rounded-lg flex gap-0.5 z-10 shadow-sm select-none">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isFocusMode;
                      setIsFocusMode(next);
                      setIsLeftCollapsed(next);
                      setIsRightCollapsed(next);
                    }}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-200",
                      isFocusMode
                        ? "bg-qz-primary/10 text-qz-primary"
                        : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                    )}
                    title={isFocusMode ? "退出专注模式" : "开启专注模式（隐藏侧栏且居中排版）"}
                  >
                    {isFocusMode ? <Minimize2 size={11.5} className="shrink-0" /> : <Maximize2 size={11.5} className="shrink-0" />}
                    <span>专注</span>
                  </button>
                  <div className="w-[1px] h-3 bg-black/[0.06] dark:bg-white/[0.06] self-center mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={clsx(
                      "px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-200",
                      !isEditing
                        ? "bg-white dark:bg-zinc-800 text-qz-primary dark:text-qz-light shadow-sm border border-black/[0.03] dark:border-white/[0.03]"
                        : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                    )}
                  >
                    <BookOpen size={11.5} className="shrink-0" />
                    <span>预览</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className={clsx(
                      "px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-200",
                      isEditing
                        ? "bg-white dark:bg-zinc-800 text-qz-primary dark:text-qz-light shadow-sm border border-black/[0.03] dark:border-white/[0.03]"
                        : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                    )}
                  >
                    <Edit2 size={11} className="shrink-0" />
                    <span>编辑</span>
                  </button>
                </div>

                {/* Content Pane */}
                <div className="flex-1 min-h-[460px] overflow-y-auto pt-8 pb-10 flex flex-col relative select-text scrollbar-thin">
                  {isEditing ? (
                    <div className="h-full flex flex-col min-h-0 flex-1">
                      {/* Markdown Formatting Toolbar */}
                      <div className="flex items-center gap-1 pb-3.5 mb-3 border-b border-black/[0.03] dark:border-white/[0.04] flex-wrap select-none">
                        <button
                          type="button"
                          onClick={() => insertMarkdown("# ")}
                          className="px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] font-bold text-qz-text-muted transition-colors cursor-pointer"
                          title="一级标题"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdown("## ")}
                          className="px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] font-bold text-qz-text-muted transition-colors cursor-pointer"
                          title="二级标题"
                        >
                          H2
                        </button>
                        <div className="w-[1px] h-3 bg-black/[0.06] dark:bg-white/[0.06] mx-1.5 self-center" />
                        <button
                          type="button"
                          onClick={() => insertMarkdown("**", true)}
                          className="px-2.5 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] font-bold text-qz-text-muted transition-colors cursor-pointer"
                          title="加粗"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdown("*", true)}
                          className="px-2.5 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] italic font-bold text-qz-text-muted transition-colors cursor-pointer"
                          title="斜体"
                        >
                          I
                        </button>
                        <div className="w-[1px] h-3 bg-black/[0.06] dark:bg-white/[0.06] mx-1.5 self-center" />
                        <button
                          type="button"
                          onClick={() => insertMarkdown("> ")}
                          className="px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] font-medium text-qz-text-muted transition-colors cursor-pointer font-serif"
                          title="引用"
                        >
                          Quote
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdown("- ")}
                          className="px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] font-bold text-qz-text-muted transition-colors cursor-pointer"
                          title="无序列表"
                        >
                          List
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdown("```\n", true)}
                          className="px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] font-mono text-qz-text-muted transition-colors cursor-pointer"
                          title="代码块"
                        >
                          Code
                        </button>
                        <button
                          type="button"
                          onClick={() => insertMarkdown("\n---\n")}
                          className="px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[11px] text-qz-text-muted transition-colors cursor-pointer"
                          title="分割线"
                        >
                          Line
                        </button>
                      </div>
                      
                      {/* Editor textarea */}
                      <textarea
                        id="note-editor-textarea"
                        value={selected.content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="使用 Markdown 开始书写您的思考和见解…"
                        className="w-full flex-1 min-h-[380px] resize-none outline-none text-[14px] leading-7 bg-transparent border-0 text-slate-800 dark:text-zinc-200 placeholder:text-qz-text-muted/50 font-mono focus:ring-0 selection:bg-qz-primary/10 transition-all duration-200"
                      />
                    </div>
                  ) : (
                    <MarkdownRenderer content={selected.content} />
                  )}
                </div>

                {/* Status Bar */}
                <div className="absolute bottom-0 inset-x-0 h-8 border-t border-black/[0.03] dark:border-white/[0.04] bg-black/[0.01] dark:bg-white/[0.01] px-5 flex items-center justify-between text-[10.5px] text-qz-text-muted z-10 select-none">
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-qz-primary" />
                    <span>字数统计：<strong className="text-qz-primary">{charCount}</strong> 字</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>预计阅读：<strong>{readingTime}</strong> 分钟</span>
                    <span>·</span>
                    <span className="font-semibold uppercase tracking-wider text-[9px]">{isEditing ? "编辑模式" : "预览模式"}</span>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-qz-text-muted p-8 select-none">
              <BookOpen size={30} className="mb-3 text-qz-light opacity-80" />
              <div className="font-serif text-[18px] text-qz-primary mb-2">选择一篇笔记查看</div>
              <p className="text-[12px] max-w-sm leading-relaxed">请在左侧目录选择任意手抄或AI笔记，右侧将立即为您呈实时渲染阅读工作台。</p>
            </div>
          )}
        </main>

        {/* Right Aside: AI Insights Sidebar */}
        <aside 
          className={clsx(
            "border-l border-qz-divider dark:border-qz-divider-dark overflow-y-auto bg-black/[0.01] dark:bg-white/[0.01] transition-all duration-300 flex flex-col gap-4 flex-shrink-0 relative",
            isRightCollapsed ? "w-0 p-0 overflow-hidden opacity-0 border-l-0" : "w-[290px] p-5 opacity-100"
          )}
        >
          {selected ? (
            <div className="space-y-4">
              
              {/* Card 1: Key Highlights */}
              <div className="qz-card !p-5 shadow-sm bg-white dark:bg-qz-card-dark border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3.5 text-qz-primary dark:text-qz-light select-none">
                  <Sparkles size={15} />
                  <span className="font-serif text-[17px] font-bold">重点提取</span>
                </div>
                <ul className="space-y-3 text-[12.5px] leading-relaxed text-qz-text dark:text-qz-text-dark font-medium">
                  {selected.aiKeyPoints.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 pl-0.5 relative group/item py-0.5">
                      <CheckCircle2 size={13.5} className="text-qz-primary dark:text-qz-light shrink-0 mt-0.5 opacity-90" />
                      <span className="text-qz-text-strong dark:text-qz-text-dark flex-1 pr-6">{item}</span>
                      
                      {/* Hover action to copy key highlights */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item);
                          alert("重点提取已成功复制到剪贴板！");
                        }}
                        className="absolute right-0 top-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-qz-primary cursor-pointer"
                        title="复制此重点"
                      >
                        <Copy size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Card 2: Confusing points */}
              <div className="qz-card !p-5 shadow-sm bg-white dark:bg-qz-card-dark border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3.5 text-amber-600 dark:text-amber-400 select-none">
                  <AlertCircle size={15} />
                  <span className="font-serif text-[17px] font-bold">易混淆点</span>
                </div>
                <ul className="space-y-3 text-[12.5px] leading-relaxed text-[#D97706] dark:text-[#FBBF24] font-medium font-sans">
                  {selected.confusingPoints.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 pl-0.5 relative group/item py-0.5">
                      <AlertCircle size={13.5} className="text-amber-500 shrink-0 mt-0.5 opacity-90" />
                      <span className="text-qz-text-strong dark:text-qz-text-dark flex-1 pr-6">{item}</span>

                      {/* Hover action to copy confusing points */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item);
                          alert("易混淆点已成功复制到剪贴板！");
                        }}
                        className="absolute right-0 top-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-amber-600 cursor-pointer"
                        title="复制此项"
                      >
                        <Copy size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ) : null}
        </aside>

      </div>
    </div>
  );
}
