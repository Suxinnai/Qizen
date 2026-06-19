import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

// 统一的空状态：图标 + 标题 + 说明 + 可选操作，跨页复用以统一留白与风格。
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  dashed = true,
  className,
}: {
  icon: IconType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  dashed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "h-full min-h-[200px] flex flex-col items-center justify-center text-center px-6 py-10 rounded-2xl select-none",
        dashed && "border border-dashed border-black/[0.06] dark:border-white/[0.08]",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-qz-primary/8 text-qz-primary flex items-center justify-center mb-3.5 shadow-sm">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="font-serif text-[18px] text-qz-primary mb-1.5">{title}</div>
      {description ? (
        <p className="text-[12.5px] text-qz-text-muted leading-relaxed max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
