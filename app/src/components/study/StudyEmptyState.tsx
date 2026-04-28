export function StudyEmptyState() {
  return (
    <div className="min-h-[46vh] flex flex-col items-center justify-center text-center text-qz-text-muted">
      <div className="font-serif text-[30px] text-qz-primary mb-3">新的学习会话</div>
      <p className="text-[13px] leading-7 max-w-[420px]">
        这里是干净空间。直接输入问题，或从目标、资料库、笔记、知识图谱带上下文进来。
      </p>
    </div>
  );
}
