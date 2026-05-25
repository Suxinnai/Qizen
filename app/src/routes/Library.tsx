import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Upload,
  ArrowRight,
  ClipboardList,
  Layers,
  Clock,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";
import { parseLibraryFile } from "../lib/library-parser";
import {
  addParsedLibraryItems,
  loadAppData,
  type KnowledgeNode,
  type ParsedLibraryItemInput,
  type PracticeSet,
  type ResourceType,
} from "../lib/storage";

const FILTERS: Array<{ key: "all" | ResourceType; label: string }> = [
  { key: "all", label: "全部" },
  { key: "PDF", label: "PDF" },
  { key: "DOCX", label: "文档" },
  { key: "MARKDOWN", label: "笔记" },
  { key: "IMAGE", label: "图片" },
];

function iconForType(type: ResourceType) {
  if (type === "IMAGE") return ImageIcon;
  if (type === "MARKDOWN") return BookOpen;
  return FileText;
}

function parserStatusLabel(status: "parsed" | "partial" | "unsupported") {
  if (status === "parsed") return "已解析";
  if (status === "partial") return "部分解析";
  return "暂不支持深度解析";
}

function PracticeItem({ item }: { item: PracticeSet }) {
  const difficultyStyle = (diff: string) => {
    switch (diff) {
      case "基础":
        return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-500/15";
      case "进阶":
        return "bg-amber-500/10 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-500/15";
      case "综合":
      default:
        return "bg-purple-500/10 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-500/15";
    }
  };

  return (
    <div className="rounded-qz border border-[#EFEDE8]/80 dark:border-zinc-800/40 bg-white dark:bg-qz-card-dark px-4 py-4 flex items-center justify-between gap-4 group hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-qz-primary/10 text-qz-primary flex items-center justify-center shrink-0">
          <ClipboardList size={15} />
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium text-qz-text-strong dark:text-qz-text-dark truncate">{item.title}</div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-qz-text-muted">
            <span className={clsx("px-2 py-0.5 rounded border text-[10px] font-medium", difficultyStyle(item.difficulty))}>
              {item.difficulty}
            </span>
            <span>·</span>
            <span>{item.questionCount} 道精选题目</span>
          </div>
        </div>
      </div>
      <span className="px-3 py-1 rounded-full bg-qz-primary/10 text-qz-primary text-[11.5px] font-bold shrink-0 flex items-center gap-1 group-hover:bg-qz-primary group-hover:text-white transition-all duration-300">
        <span>可开始</span>
        <ChevronRight size={12} />
      </span>
    </div>
  );
}

interface UploadProgress {
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
}

interface UploadResult {
  type: "success" | "error";
  message: string;
}

export default function Library() {
  const navigate = useNavigate();
  const [data, setData] = useState(() => loadAppData());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [activeTab, setActiveTab] = useState<"analysis" | "reading" | "practice">("analysis");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    return data.libraryItems.filter((item) => {
      const matchesFilter = filter === "all" ? true : item.type === filter;
      const needle = query.trim();
      const matchesQuery =
        needle.length === 0
          ? true
          : item.title.includes(needle) ||
            item.originalFileName.includes(needle) ||
            item.tags.some((tag) => tag.includes(needle)) ||
            item.summary.includes(needle) ||
            item.preview.includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [data.libraryItems, filter, query]);

  const [selectedId, setSelectedId] = useState(() => data.libraryItems[0]?.id ?? "");
  const selected =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? data.libraryItems[0];
  const practiceItems = data.practiceSets.filter(
    (item) => item.resourceId === selected?.id || item.resourceId === null
  );
  const selectedLinkedNodeIds = Array.isArray(selected?.linkedNodeIds) ? selected.linkedNodeIds : [];
  const linkedNodes: KnowledgeNode[] = selected
    ? data.knowledgeGraph.nodes.filter((node) => selectedLinkedNodeIds.includes(node.id))
    : [];

  function refresh() {
    const next = loadAppData();
    setData(next);
    if (!selectedId && next.libraryItems[0]) setSelectedId(next.libraryItems[0].id);
  }

  function handleUpload() {
    fileInputRef.current?.click();
  }

  async function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setIsUploading(true);
    setUploadResults([]);
    const parsedItems: ParsedLibraryItemInput[] = [];
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({
        currentFile: file.name,
        currentIndex: i + 1,
        totalFiles: files.length,
      });
      try {
        const parsed = await parseLibraryFile(file);
        parsedItems.push(parsed);
        if (parsed.parserStatus === "unsupported") {
          results.push({ type: "success", message: `${file.name}：已收纳，但格式暂不支持深度解析` });
        } else {
          results.push({ type: "success", message: `${file.name}：解析完成` });
        }
      } catch {
        results.push({ type: "error", message: `${file.name}：解析失败，已跳过` });
      }
    }

    if (parsedItems.length > 0) {
      addParsedLibraryItems(parsedItems);
      refresh();
      const newest = loadAppData().libraryItems[0];
      if (newest) setSelectedId(newest.id);
    }

    setUploadProgress(null);
    setUploadResults(results);
    setIsUploading(false);
    event.target.value = "";

    if (results.length > 0) {
      window.setTimeout(() => setUploadResults([]), 5000);
    }
  }

  return (
    <div className="relative h-full overflow-hidden bg-qz-bg dark:bg-qz-bg-dark transition-colors duration-200">
      <div className="h-full p-8 max-w-[1320px] mx-auto flex flex-col gap-4">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-qz-divider dark:border-qz-divider-dark pb-5">
          <div>
            <h1 className="font-serif text-[34px] text-qz-text-strong dark:text-qz-text-dark mb-1.5 font-bold">资料库</h1>
            <p className="font-serif italic text-[14px] text-qz-text-muted">厚积薄发，栖于卷帙</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.md,.txt,.png,.jpg,.jpeg,.webp"
                onChange={onFilesChange}
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="qz-btn-primary h-10 px-5 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm font-bold leading-none"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Upload size={14} className="shrink-0" />}
                <span>{isUploading ? "正在解析…" : "上传并解析资料"}</span>
              </button>
            </div>
            {uploadProgress ? (
              <div className="flex items-center gap-2 text-[11px] text-qz-text-muted">
                <Loader2 size={12} className="animate-spin text-qz-primary" />
                <span>解析中（{uploadProgress.currentIndex}/{uploadProgress.totalFiles}）：{uploadProgress.currentFile}</span>
              </div>
            ) : null}
            {uploadResults.length > 0 ? (
              <div className="space-y-1.5 w-full max-w-[320px] absolute right-8 top-24 z-50 shadow-lg">
                {uploadResults.map((result, index) => (
                  <div
                    key={`${index}-${result.message}`}
                    className={clsx(
                      "flex items-start gap-2 rounded-qz px-3.5 py-2.5 text-[11px] leading-5 border shadow-sm",
                      result.type === "success"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    )}
                  >
                    {result.type === "success" ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span>{result.message}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Compact Horizontal Stats Capsule */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/40 dark:bg-qz-card-dark/30 border border-black/5 dark:border-white/5 rounded-qz px-6 py-3.5 text-[12.5px] shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-qz-primary animate-pulse" />
            <span className="text-qz-text-muted font-medium">已收纳资料：</span>
            <span className="font-bold text-qz-text-strong dark:text-qz-text-dark">{data.libraryItems.length} 份</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-qz-divider dark:bg-qz-divider-dark" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-qz-text-muted font-medium">AI 生成练习：</span>
            <span className="font-bold text-qz-text-strong dark:text-qz-text-dark">{data.practiceSets.length} 套</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-qz-divider dark:bg-qz-divider-dark" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-qz-text-muted font-medium">支持解析格式：</span>
            <span className="font-bold text-qz-primary dark:text-qz-light font-serif">PDF · Markdown · DOCX</span>
          </div>
        </div>

        {/* Dynamic Studio Workspace Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-[380px,1fr] gap-6">

          {/* Left Panel: Document List */}
          <div className="min-h-0 flex flex-col rounded-qz border border-[#EFEDE8] dark:border-white/5 bg-white/60 dark:bg-black/10 overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 border-b border-qz-divider dark:border-qz-divider-dark flex flex-col gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-qz-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索资料名、标签、摘要…"
                  className="w-full h-9 rounded-full bg-white/80 dark:bg-black/20 border border-[#EFEDE8] dark:border-white/5 pl-9 pr-4 text-[12px] outline-none hover:border-qz-primary/30 focus:border-qz-primary/80 dark:focus:border-qz-primary/80 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={clsx(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer",
                      filter === item.key
                        ? "bg-qz-primary text-white shadow-sm bg-gradient-to-r from-[#2D7A6B] to-[#1A5448]"
                        : "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-qz-text-muted p-4">
                  <FileUp size={28} className="mb-3 text-qz-light" />
                  <div className="font-serif text-[18px] text-qz-primary mb-2">无符合条件的资料</div>
                  <p className="text-[11.5px] leading-relaxed mb-4">您可以上传 PDF、Markdown，Qizen 会在本地智能提取重点与摘要。</p>
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="qz-btn-primary h-8 px-3.5 text-[11.5px]"
                  >
                    立即上传
                  </button>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const Icon = iconForType(item.type);
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setActiveTab("analysis");
                      }}
                      className={clsx(
                        "w-full text-left rounded-qz px-4 py-3.5 border transition-all duration-300 relative group",
                        active
                          ? "bg-[#E2F1EC]/30 dark:bg-[rgba(45,122,107,0.12)] border-qz-primary shadow-sm"
                          : "bg-white/70 dark:bg-black/15 border-black/5 dark:border-white/5 hover:border-black/[0.08] dark:hover:border-white/[0.08] hover:bg-white dark:hover:bg-black/25 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-qz-primary/10 text-qz-primary flex items-center justify-center shrink-0 border border-qz-primary/10">
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className={clsx(
                              "text-[13.5px] font-semibold text-qz-text-strong dark:text-qz-text-dark group-hover:text-qz-primary dark:group-hover:text-qz-light transition-colors truncate",
                              active && "text-qz-primary dark:text-qz-light font-bold"
                            )}>
                              {item.title}
                            </div>
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted border border-black/5 dark:border-white/5 shrink-0 uppercase tracking-wider font-bold">
                              {item.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-qz-text-muted mt-1">
                            {item.course} · {item.sizeLabel}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                            <span className={clsx(
                              "text-[9.5px] px-2 py-0.5 rounded-full font-bold border",
                              item.parserStatus === "parsed"
                                ? "bg-qz-primary/10 text-qz-primary border-qz-primary/10"
                                : item.parserStatus === "partial"
                                ? "bg-amber-500/10 text-[#B47F1C] border-amber-500/10"
                                : "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted border-transparent"
                            )}>
                              {parserStatusLabel(item.parserStatus)}
                            </span>
                            {item.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-[9.5px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] text-qz-text-muted border border-black/5 dark:border-white/5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected Document Studio Workspace */}
          <div className="min-h-0 flex flex-col bg-white dark:bg-qz-card-dark border border-[#EFEDE8] dark:border-white/5 rounded-qz shadow-sm overflow-hidden">
            {selected ? (
              <div className="h-full flex flex-col min-h-0">
                
                {/* Workspace Header Block */}
                <div className="px-6 py-5 border-b border-qz-divider dark:border-qz-divider-dark bg-gradient-to-b from-qz-primary/[0.015] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="min-w-0">
                    <h2 className="font-serif text-[25px] text-qz-text-strong dark:text-qz-text-dark font-bold leading-tight truncate">
                      {selected.title}
                    </h2>
                    
                    {/* Modern Clean Metadata Badges */}
                    <div className="text-[11px] text-qz-text-muted mt-2.5 flex items-center gap-2 flex-wrap font-medium">
                      <span className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm">
                        <FileText size={11.5} className="text-qz-primary dark:text-qz-light opacity-80" />
                        <span>{selected.originalFileName}</span>
                      </span>
                      <span className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm">
                        <Layers size={11.5} className="text-qz-primary dark:text-qz-light opacity-80" />
                        <span>{selected.course}</span>
                      </span>
                      <span className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-0.5 rounded border border-black/5 dark:border-white/5 shadow-sm">
                        <Clock size={11.5} className="text-qz-primary dark:text-qz-light opacity-80" />
                        <span>{selected.sizeLabel}{selected.pageCount ? ` · ${selected.pageCount}页` : ""}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/study", {
                        state: {
                          source: "library",
                          resourceId: selected.id,
                          nodeId: linkedNodes[0]?.id,
                        },
                      })
                    }
                    className="qz-btn-primary h-9 px-4 text-[12px] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-[0_4px_12px_rgba(45,122,107,0.18)] hover:shadow-[0_6px_18px_rgba(45,122,107,0.25)] group font-bold leading-none"
                  >
                    <span>带着去学习空间</span>
                    <ArrowRight size={13} className="opacity-80 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
                  </button>
                </div>

                {/* Modern Studio Tab Segment Control */}
                <div className="px-6 py-3 border-b border-qz-divider dark:border-qz-divider-dark bg-slate-50/20 dark:bg-zinc-900/10 flex items-center">
                  <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/5 dark:border-white/5 p-1 rounded-xl flex gap-1 w-full max-w-[420px] shadow-sm">
                    <button
                      type="button"
                      onClick={() => setActiveTab("analysis")}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 leading-none",
                        activeTab === "analysis"
                          ? "bg-white dark:bg-qz-card-dark text-qz-primary dark:text-qz-light shadow-sm"
                          : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                      )}
                    >
                      <Sparkles size={13} className="shrink-0" />
                      <span>AI 智能分析</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab("reading")}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 leading-none",
                        activeTab === "reading"
                          ? "bg-white dark:bg-qz-card-dark text-qz-primary dark:text-qz-light shadow-sm"
                          : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                      )}
                    >
                      <BookOpen size={13} className="shrink-0" />
                      <span>正文深度阅读</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab("practice")}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 leading-none",
                        activeTab === "practice"
                          ? "bg-white dark:bg-qz-card-dark text-qz-primary dark:text-qz-light shadow-sm"
                          : "text-qz-text-muted hover:text-qz-text-strong dark:hover:text-qz-text-dark"
                      )}
                    >
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>智能评测练习</span>
                      {practiceItems.length > 0 && (
                        <span className={clsx(
                          "ml-1 w-5 h-5 rounded-full text-[9.5px] font-extrabold flex items-center justify-center transition-colors",
                          activeTab === "practice" 
                            ? "bg-qz-primary/10 text-qz-primary" 
                            : "bg-black/5 dark:bg-white/10 text-qz-text-muted"
                        )}>
                          {practiceItems.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Workspace Dynamic Content Pane */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-white dark:bg-qz-card-dark">
                  
                  {/* TAB 1: AI 智能分析 */}
                  {activeTab === "analysis" && (
                    <div className="space-y-6">
                      
                      {/* Summary Block with elegant Left Accent Bar */}
                      <div className="rounded-r-qz border-l-4 border-qz-primary bg-qz-primary/[0.02] dark:bg-qz-primary/[0.05] py-3.5 px-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5 text-qz-primary dark:text-qz-light font-bold text-[12px] tracking-wider">
                          <Sparkles size={13} className="opacity-95" />
                          <span>AI 核心摘要</span>
                        </div>
                        <p className="text-[13px] text-qz-text dark:text-qz-text-dark leading-relaxed font-normal">
                          {selected.summary}
                        </p>
                      </div>

                      {/* Extracted Highlights as soft borderless cards */}
                      <div>
                        <h4 className="font-serif text-[16px] text-qz-text-strong dark:text-qz-text-dark font-bold mb-2.5 flex items-center gap-2">
                          <Layers size={15} className="text-qz-primary dark:text-qz-light opacity-80" />
                          <span>提取重点与核心条件</span>
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {selected.highlights.length > 0 ? (
                            selected.highlights.map((item, index) => (
                              <div 
                                key={item} 
                                className="rounded-qz bg-black/[0.015] hover:bg-qz-primary/[0.015] dark:bg-white/[0.015] dark:hover:bg-qz-primary/[0.04] border border-[#EFEDE8]/80 dark:border-zinc-800/40 py-2.5 px-3.5 text-[12.5px] text-qz-text dark:text-qz-text-dark leading-relaxed transition-all duration-300 shadow-sm flex items-start gap-2.5"
                              >
                                <span className="w-5 h-5 rounded-full bg-qz-primary/10 text-qz-primary flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                                  {index + 1}
                                </span>
                                <span className="font-medium">{item}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[12.5px] text-[#808080] py-2 col-span-2 italic">这份资料暂时还没有提取出明显重点。</div>
                          )}
                        </div>
                      </div>

                      {/* Linked Knowledge Nodes */}
                      <div className="border-t border-qz-divider dark:border-qz-divider-dark pt-4">
                        <h4 className="font-serif text-[16px] text-qz-text-strong dark:text-qz-text-dark font-bold mb-2.5">关联到的知识节点</h4>
                        {linkedNodes.length > 0 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {linkedNodes.map((node) => (
                              <span 
                                key={node.id} 
                                className="text-[11px] px-3 py-1 rounded-full bg-slate-50 dark:bg-zinc-900/40 text-qz-text dark:text-qz-text-dark font-semibold border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-1.5 hover:border-qz-primary/30 transition-all duration-200"
                              >
                                <Layers size={11} className="opacity-70 text-qz-primary dark:text-qz-light" />
                                <span>{node.label}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[12.5px] text-qz-text-muted italic">这份资料暂时还没有关联到明确的知识图谱节点。</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: 正文深度阅读 (Spacious Serif Reading Sheet) */}
                  {activeTab === "reading" && (
                    <div className="h-full flex flex-col min-h-0 space-y-4">
                      
                      {/* Reader view box - pure paper design */}
                      <div className="flex-1 min-h-[380px] max-h-[500px] overflow-y-auto p-8 rounded-qz border border-[#EFEDE8]/80 dark:border-zinc-800/40 bg-gradient-to-br from-slate-50/20 to-transparent dark:from-zinc-900/10 font-serif leading-relaxed text-[14px] text-qz-text-strong dark:text-qz-text-dark whitespace-pre-wrap select-text selection:bg-qz-primary/15 relative shadow-inner">
                        {selected.extractedText || "这份资料当前还没有可提取的文本正文。"}
                      </div>
                      
                      {/* Reader bottom metadata panel */}
                      <div className="flex items-center justify-between text-[11px] text-qz-text-muted bg-slate-50/40 dark:bg-zinc-900/10 border border-[#EFEDE8]/50 dark:border-zinc-800/20 px-4 py-2.5 rounded-lg">
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileText size={12.5} className="text-qz-primary dark:text-qz-light" />
                          <span>正文解析状态：{parserStatusLabel(selected.parserStatus)}</span>
                        </span>
                        <span>共 {selected.extractedText?.length || 0} 字</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: 智能评测练习 */}
                  {activeTab === "practice" && (
                    <div className="space-y-5">
                      <div className="rounded-qz bg-gradient-to-br from-purple-50/10 to-transparent dark:from-purple-950/10 p-4 border border-purple-500/10 flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 shrink-0">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-qz-text-strong dark:text-qz-text-dark">AI 智能专项测评</h4>
                          <p className="text-[12px] text-qz-text-muted mt-1 leading-relaxed">
                            以下是为本份资料定制的多级评测练习。通过专项测评，AI 将智能定位您的薄弱环节，并自动同步更新您的学习风格偏好与能力画像。
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {practiceItems.length > 0 ? (
                          practiceItems.map((item) => (
                            <PracticeItem key={item.id} item={item} />
                          ))
                        ) : (
                          <div className="rounded-qz border border-dashed border-qz-divider dark:border-qz-divider-dark py-12 px-4 text-center">
                            <ClipboardList size={28} className="mx-auto text-qz-text-muted opacity-40 mb-3" />
                            <h5 className="text-[14px] font-bold text-qz-text-strong dark:text-qz-text-dark mb-1">针对此资料暂无专项练习</h5>
                            <p className="text-[12px] text-qz-text-muted max-w-sm mx-auto leading-relaxed">
                              您可以点击右上角的「去学习空间」带着本份资料开启会话，系统将在对话交互中为您量量身定制练习题。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-qz-text-muted p-8">
                <BookOpen size={30} className="mb-3.5 text-qz-light opacity-80" />
                <div className="font-serif text-[20px] text-qz-primary mb-2">选择一份资料开启工作台</div>
                <p className="text-[12px] max-w-sm leading-relaxed">请从左侧文档列表中挑选任意资料，右侧将立即为您构筑全屏宽域 AI 摘要分析与正文阅读工作台。</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

