export function NotePanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-qz-text-muted">灵已经把这一段帮你记下来了，你可以直接编辑。</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={18}
        placeholder="在这里写点什么……"
        className="w-full resize-none rounded-[14px] bg-white/65 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] px-3.5 py-3 text-[12.5px] leading-[1.7] outline-none placeholder:text-qz-text-muted/60 focus:border-qz-primary/30 transition-colors"
      />
    </div>
  );
}

