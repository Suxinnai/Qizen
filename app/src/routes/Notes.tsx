import { useMemo, useState } from "react";
import { Copy, Download, Sparkles } from "lucide-react";
import { loadAppData, updateNote } from "../lib/storage";

export default function Notes() {
  const initialData = useMemo(() => loadAppData(), []);
  const [notes, setNotes] = useState(initialData.notes);
  const [selectedId, setSelectedId] = useState(initialData.notes[0]?.id ?? "");

  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];

  function handleContentChange(content: string) {
    if (!selected) return;
    const next = notes.map((note) => (note.id === selected.id ? { ...note, content, updatedAt: new Date().toISOString() } : note));
    setNotes(next);
    updateNote(selected.id, content);
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full grid grid-cols-[220px,1fr,300px]">
        <aside className="border-r border-black/5 dark:border-white/5 overflow-y-auto p-4">
          <div className="font-serif text-[22px] text-qz-primary mb-4">笔记</div>
          <div className="space-y-2">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left rounded-md px-3 py-3 transition-colors ${selectedId === note.id ? "bg-qz-primary/10 text-qz-primary" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
              >
                <div className="text-[13px] font-medium">{note.title}</div>
                <div className="text-[11px] text-qz-text-muted mt-1">{note.topic}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="overflow-y-auto p-8">
          {selected && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="font-serif text-[34px] text-qz-primary">{selected.title}</h1>
                  <p className="font-serif italic text-[14px] text-qz-text-muted mt-2">手抄一遍，胜读十遍</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 rounded-md border border-black/10 dark:border-white/10 text-[12px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"><Download size={14} />导出</button>
                  <button className="px-3 py-2 rounded-md border border-black/10 dark:border-white/10 text-[12px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"><Copy size={14} />复制到 Anki</button>
                </div>
              </div>

              <textarea
                value={selected.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full min-h-[520px] qz-card !p-6 resize-none outline-none text-[14px] leading-7 bg-transparent"
              />
            </div>
          )}
        </main>

        <aside className="border-l border-black/5 dark:border-white/5 overflow-y-auto p-5 bg-black/[0.015] dark:bg-white/[0.015]">
          {selected && (
            <div className="space-y-4">
              <div className="qz-card !p-5">
                <div className="flex items-center gap-2 mb-3 text-qz-primary">
                  <Sparkles size={16} />
                  <span className="font-serif text-[18px]">重点提取</span>
                </div>
                <ul className="space-y-2 text-[13px] text-qz-text-muted">
                  {selected.aiKeyPoints.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="qz-card !p-5">
                <div className="font-serif text-[18px] mb-3 text-qz-text-strong dark:text-qz-text-dark">易混淆点</div>
                <ul className="space-y-2 text-[13px] text-qz-text-muted">
                  {selected.confusingPoints.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
