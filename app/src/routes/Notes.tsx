import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Copy, 
  Download, 
  Sparkles, 
  BookOpen, 
  Edit2, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal
} from "lucide-react";
import clsx from "clsx";
import { loadAppData, updateNote } from "../lib/storage";

// A beautiful lightweight Markdown Renderer
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  
  return (
    <div className="font-serif leading-relaxed text-[14.5px] space-y-4 text-qz-text dark:text-qz-text-dark select-text selection:bg-qz-primary/10">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Header 1: # Header
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={idx} className="font-serif text-[24px] font-bold text-qz-text-strong dark:text-qz-text-dark border-b border-qz-divider dark:border-qz-divider-dark pb-2.5 mt-6 mb-4">
              {trimmed.slice(2)}
            </h3>
          );
        }
        
        // Header 2: ## Header
        if (trimmed.startsWith("## ")) {
          return (
            <h4 key={idx} className="font-serif text-[18.5px] font-bold text-qz-text-strong dark:text-qz-text-dark mt-5 mb-3">
              {trimmed.slice(3)}
            </h4>
          );
        }
        
        // Blockquote: > text
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-4 border-qz-primary bg-qz-primary/[0.02] dark:bg-qz-primary/[0.05] rounded-r-lg px-4 py-3 italic text-[14px] leading-relaxed text-qz-primary dark:text-qz-light my-4">
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
          <p key={idx} className="leading-7 font-sans text-[14px] text-qz-text dark:text-qz-text-dark">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function Notes() {
  const navigate = useNavigate();
  const initialData = useMemo(() => loadAppData(), []);
  const [notes, setNotes] = useState(initialData.notes);
  const [selectedId, setSelectedId] = useState(initialData.notes[0]?.id ?? "");
  const [isEditing, setIsEditing] = useState(false); // Default to Preview Mode

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

  // Format the updated timestamp beautifully into slashes: MM/DD HH:mm
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

  return (
    <div className="h-full overflow-hidden bg-qz-bg dark:bg-qz-bg-dark transition-colors duration-200">
      <div className="h-full grid grid-cols-[210px,1fr,290px] min-h-0">
        
        {/* Left Aside: Notes Directory */}
        <aside className="border-r border-qz-divider dark:border-qz-divider-dark overflow-y-auto p-5 bg-white/30 dark:bg-black/5">
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
        <main className="overflow-y-auto p-8 bg-white dark:bg-qz-card-dark/20 flex flex-col min-h-0">
          {selected ? (
            <div className="w-full flex-1 flex flex-col min-h-0">
              
              {/* Header Title Section (Single Row, No Truncation) */}
              <div className="mb-4.5 shrink-0">
                <h1 className="font-serif text-[34px] text-qz-text-strong dark:text-qz-text-dark font-bold tracking-tight leading-tight">
                  {selected.title}
                </h1>
                <p className="font-serif italic text-[14px] text-qz-text-muted mt-1.5">手抄一遍，胜读十遍</p>
              </div>

              {/* Sub-bar: Metadata on Left, Actions on Right */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-qz-divider dark:border-qz-divider-dark pb-4.5 mb-5 shrink-0">
                <div className="text-[12px] text-qz-text-muted font-medium flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-qz-primary/10 text-qz-primary text-[10.5px] font-bold">
                    {selected.topic}
                  </span>
                  <span>·</span>
                  <span>最近更新：{updatedDate}</span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate("/study", { state: { source: "note", noteId: selected.id } })}
                    className="qz-btn-primary h-9 px-3.5 text-[11.5px] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm font-bold leading-none"
                  >
                    <Sparkles size={12} className="opacity-95 shrink-0" />
                    <span>带去学习空间</span>
                  </button>
                  <button className="qz-btn-secondary h-9 px-3.5 text-[11.5px] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm font-semibold leading-none">
                    <Download size={13} className="shrink-0" />
                    <span>导出</span>
                  </button>
                  
                  {/* More Actions Dropdown Menu */}
                  <div className="relative group/more">
                    <button 
                      type="button"
                      className="qz-btn-secondary h-9 w-9 p-0 rounded-full flex items-center justify-center shrink-0 shadow-sm hover:border-qz-primary/30 transition-all"
                    >
                      <MoreHorizontal size={15} className="text-qz-text-muted group-hover/more:text-qz-primary transition-colors" />
                    </button>
                    {/* Floating Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-44 rounded-qz border border-black/5 dark:border-white/5 bg-white dark:bg-qz-card-dark p-1.5 shadow-lg opacity-0 pointer-events-none group-hover/more:opacity-100 group-hover/more:pointer-events-auto transition-all duration-200 z-30">
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selected.content);
                          alert("已将笔记内容复制到剪贴板，您可以直接粘贴至 Anki！");
                        }}
                        className="w-full text-left rounded-md px-3 py-2 text-[12px] text-qz-text dark:text-qz-text-dark hover:bg-black/[0.04] dark:hover:bg-white/[0.04] flex items-center gap-2 transition-colors font-medium"
                      >
                        <Copy size={12} className="text-qz-primary shrink-0" />
                        <span>复制到 Anki</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note view container with Segmented Switch */}
              <div className="flex-1 flex flex-col min-h-0 qz-card !p-6 relative shadow-sm border border-black/5 dark:border-white/5 bg-white dark:bg-qz-card-dark overflow-hidden">
                
                {/* Preview/Edit Toggle Tab with Premium Glassmorphism */}
                <div className="absolute right-6 top-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/5 dark:border-white/5 p-0.5 rounded-lg flex gap-0.5 z-10 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={clsx(
                      "px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-200",
                      !isEditing
                        ? "bg-white dark:bg-zinc-800 text-qz-primary dark:text-qz-light shadow-sm"
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
                        ? "bg-white dark:bg-zinc-800 text-qz-primary dark:text-qz-light shadow-sm"
                        : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                    )}
                  >
                    <Edit2 size={11} className="shrink-0" />
                    <span>编辑</span>
                  </button>
                </div>

                {/* Content Pane */}
                <div className="flex-1 min-h-[460px] overflow-y-auto pt-8">
                  {isEditing ? (
                    <textarea
                      value={selected.content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="使用 Markdown 开始书写您的思考和见解…"
                      className="w-full h-full min-h-[420px] resize-none outline-none text-[14px] leading-7 bg-transparent border-0 text-slate-800 dark:text-zinc-200 placeholder:text-qz-text-muted/60 font-mono focus:ring-0 selection:bg-qz-primary/10 transition-all duration-200"
                    />
                  ) : (
                    <MarkdownRenderer content={selected.content} />
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-qz-text-muted p-8">
              <BookOpen size={30} className="mb-3 text-qz-light opacity-80" />
              <div className="font-serif text-[18px] text-qz-primary mb-2">选择一篇笔记查看</div>
              <p className="text-[12px] max-w-sm leading-relaxed">请在左侧目录选择任意手抄或AI笔记，右侧将立即为您呈现实时渲染阅读工作台。</p>
            </div>
          )}
        </main>

        {/* Right Aside: AI Insights Sidebar */}
        <aside className="border-l border-qz-divider dark:border-qz-divider-dark overflow-y-auto p-5 bg-black/[0.01] dark:bg-white/[0.01] flex flex-col gap-4">
          {selected ? (
            <div className="space-y-4">
              
              {/* Card 1: Key Highlights with CheckCircle icons */}
              <div className="qz-card !p-5 shadow-sm bg-white dark:bg-qz-card-dark border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3.5 text-qz-primary dark:text-qz-light">
                  <Sparkles size={15} />
                  <span className="font-serif text-[17px] font-bold">重点提取</span>
                </div>
                <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-qz-text dark:text-qz-text-dark font-medium">
                  {selected.aiKeyPoints.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 pl-0.5">
                      <CheckCircle2 size={13.5} className="text-qz-primary dark:text-qz-light shrink-0 mt-0.5 opacity-90" />
                      <span className="text-qz-text-strong dark:text-qz-text-dark">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Card 2: Confusing points with AlertCircle icons */}
              <div className="qz-card !p-5 shadow-sm bg-white dark:bg-qz-card-dark border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2 mb-3.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle size={15} />
                  <span className="font-serif text-[17px] font-bold">易混淆点</span>
                </div>
                <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-[#D97706] dark:text-[#FBBF24] font-medium font-sans">
                  {selected.confusingPoints.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 pl-0.5">
                      <AlertCircle size={13.5} className="text-amber-500 shrink-0 mt-0.5 opacity-90" />
                      <span className="text-qz-text-strong dark:text-qz-text-dark">{item}</span>
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
