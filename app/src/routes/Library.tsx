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

interface UploadProgress {
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
}

interface UploadResult {
  type: "success" | "error";
  message: string;
}

function PracticeItem({ item }: { item: PracticeSet }) {
  return (
    <div className="rounded-[16px] border border-black/5 dark:border-white/5 bg-white/70 dark:bg-black/15 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{item.title}</div>
          <div className="mt-1 text-[11px] text-qz-text-muted">
            {item.difficulty} · {item.questionCount} 题
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary text-[10px] shrink-0">
          可开始
        </span>
      </div>
    </div>
  );
}

export default function Library() {
  const navigate = useNavigate();
  const [data, setData] = useState(() => loadAppData());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
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
    <div className="relative h-full overflow-hidden">
      <div className="h-full p-8 max-w-[1320px] mx-auto flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[34px] text-qz-primary mb-2">资料库</h1>
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
                className="qz-btn-primary h-10 px-4 text-[13px] flex items-center gap-2 disabled:opacity-60"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isUploading ? "正在解析…" : "上传并解析资料"}
              </button>
            </div>
            {uploadProgress ? (
              <div className="flex items-center gap-2 text-[11px] text-qz-text-muted">
                <Loader2 size={12} className="animate-spin text-qz-primary" />
                <span>解析中（{uploadProgress.currentIndex}/{uploadProgress.totalFiles}）：{uploadProgress.currentFile}</span>
              </div>
            ) : null}
            {uploadResults.length > 0 ? (
              <div className="space-y-1.5 w-full max-w-[320px]">
                {uploadResults.map((result, index) => (
                  <div
                    key={`${index}-${result.message}`}
                    className={clsx(
                      "flex items-start gap-2 rounded-[10px] px-3 py-2 text-[11px] leading-5",
                      result.type === "success"
                        ? "bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/8 text-rose-700 dark:text-rose-300"
                    )}
                  >
                    {result.type === "success" ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                    <span>{result.message}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="qz-card !p-4">
            <div className="text-[11px] text-qz-text-muted mb-1">已收纳资料</div>
            <div className="font-serif text-[28px] text-qz-primary">{data.libraryItems.length}</div>
          </div>
          <div className="qz-card !p-4">
            <div className="text-[11px] text-qz-text-muted mb-1">AI 生成练习</div>
            <div className="font-serif text-[28px] text-qz-primary">{data.practiceSets.length}</div>
          </div>
          <div className="qz-card !p-4">
            <div className="text-[11px] text-qz-text-muted mb-1">可解析格式</div>
            <div className="font-serif text-[22px] text-qz-primary">PDF · Markdown · DOCX</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[1.08fr,420px] gap-6">
          <div className="min-h-0 flex flex-col rounded-[24px] border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-[340px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-qz-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索资料名、标签、摘要…"
                  className="w-full h-10 rounded-full bg-white/80 dark:bg-black/20 border border-black/5 dark:border-white/5 pl-9 pr-4 text-[12px] outline-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={clsx(
                      "px-3 py-1.5 rounded-full text-[12px] transition-all",
                      filter === item.key
                        ? "bg-qz-primary text-white shadow-[0_2px_8px_rgba(45,122,107,0.2)] bg-gradient-to-r from-[#2D7A6B] to-[#1A5448] font-medium"
                        : "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-qz-text-muted">
                  <FileUp size={28} className="mb-3 text-qz-light" />
                  <div className="font-serif text-[20px] text-qz-primary mb-2">还没有符合条件的资料</div>
                  <p className="text-[12px] mb-4">你可以先上传 PDF、Markdown 或课堂笔记，Qizen 会直接在本地做摘要和重点提取。</p>
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="qz-btn-primary h-9 px-4 text-[12px]"
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
                      onClick={() => setSelectedId(item.id)}
                      className={clsx(
                        "w-full text-left rounded-[18px] px-4 py-4 border transition-all duration-300",
                        active
                          ? "bg-[#E2F1EC]/40 dark:bg-[rgba(45,122,107,0.12)] border-[#2D7A6B] shadow-[0_4px_12px_rgba(45,122,107,0.04)] font-medium"
                          : "bg-white/70 dark:bg-black/15 border-black/5 dark:border-white/5 hover:border-black/[0.1] dark:hover:border-white/[0.1] hover:bg-white dark:hover:bg-black/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-qz-primary/10 text-qz-primary flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark truncate">{item.title}</div>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 dark:bg-black/20 text-qz-text-muted shrink-0">{item.type}</span>
                          </div>
                          <div className="text-[11px] text-qz-text-muted mt-1">{item.course} · {item.sizeLabel}</div>
                          <div className="text-[11px] text-qz-text-muted mt-2 line-clamp-2">{item.preview}</div>
                          <div className="flex items-center gap-2 flex-wrap mt-3">
                            <span className={clsx(
                              "text-[10px] px-2 py-1 rounded-full",
                              item.parserStatus === "parsed"
                                ? "bg-qz-primary/10 text-qz-primary"
                                : item.parserStatus === "partial"
                                ? "bg-[#E8A93C]/12 text-[#B47F1C]"
                                : "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted"
                            )}>
                              {parserStatusLabel(item.parserStatus)}
                            </span>
                            {item.tags.map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.05] text-qz-text-muted">
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

          <div className="min-h-0 flex flex-col gap-4">
            <div className="qz-card flex-1 !p-5 overflow-y-auto">
              {selected ? (
                <>
                  <div className="flex items-center gap-2 mb-3 text-qz-primary">
                    <Sparkles size={15} />
                    <span className="font-serif text-[20px]">解析结果</span>
                  </div>
                  <div className="font-serif text-[28px] text-qz-text-strong dark:text-qz-text-dark leading-tight mb-3">
                    {selected.title}
                  </div>
                  <div className="text-[12px] text-qz-text-muted leading-7 mb-4">
                    文件名：{selected.originalFileName}<br />
                    类型：{selected.type} · {selected.sizeLabel}{selected.pageCount ? ` · ${selected.pageCount} 页` : ""}<br />
                    课程：{selected.course}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-5">
                    <span className={clsx(
                      "text-[11px] px-2.5 py-1 rounded-full",
                      selected.parserStatus === "parsed"
                        ? "bg-qz-primary/10 text-qz-primary"
                        : selected.parserStatus === "partial"
                        ? "bg-[#E8A93C]/12 text-[#B47F1C]"
                        : "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted"
                    )}>
                      {parserStatusLabel(selected.parserStatus)}
                    </span>
                    {selected.tags.map((tag) => (
                      <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-qz-primary/10 text-qz-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-[18px] bg-qz-primary/6 px-4 py-4 text-[12px] text-qz-text-muted leading-7 mb-4">
                    <div className="text-[11px] text-qz-text-muted mb-1">摘要</div>
                    {selected.summary}
                  </div>
                  <div className="mb-4">
                    <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-3">提取重点</div>
                    <div className="space-y-2">
                      {selected.highlights.length > 0 ? (
                        selected.highlights.map((item) => (
                          <div key={item} className="rounded-[14px] border border-black/5 dark:border-white/5 px-3 py-3 text-[12px] text-qz-text-muted leading-6">
                            • {item}
                          </div>
                        ))
                      ) : (
                        <div className="text-[12px] text-qz-text-muted">这份资料暂时还没有提取出明显重点。</div>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-3">关联到的知识节点</div>
                    {linkedNodes.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {linkedNodes.map((node) => (
                          <span key={node.id} className="text-[11px] px-2.5 py-1 rounded-full bg-qz-primary/10 text-qz-primary">
                            {node.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-qz-text-muted">这份资料暂时还没有关联到明确节点。</div>
                    )}
                  </div>
                  <div className="mb-4">
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
                      className="qz-btn-primary w-full h-10 text-[13px]"
                    >
                      带着这份资料去学习空间
                    </button>
                  </div>
                  <div>
                    <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-3">正文预览</div>
                    <div className="rounded-[16px] border border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/10 px-4 py-4 text-[12px] text-qz-text-muted leading-7 whitespace-pre-wrap max-h-[220px] overflow-y-auto">
                      {selected.extractedText || "这份资料当前还没有可显示的正文内容。"}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-qz-text-muted">
                  <BookOpen size={26} className="mb-3 text-qz-light" />
                  <div className="font-serif text-[20px] text-qz-primary mb-2">选一份资料看看</div>
                  <p className="text-[12px]">左边点开任何一份，右边就会展示解析摘要、重点和正文预览。</p>
                </div>
              )}
            </div>

            <div className="qz-card !p-5 overflow-y-auto max-h-[340px]">
              <div className="flex items-center gap-2 mb-4 text-qz-primary">
                <Sparkles size={15} />
                <span className="font-serif text-[20px]">AI 生成练习</span>
              </div>
              <div className="space-y-3">
                {practiceItems.map((item) => (
                  <PracticeItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
