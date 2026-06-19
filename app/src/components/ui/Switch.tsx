import { motion } from "framer-motion";
import clsx from "clsx";

// 品牌化开关：替换原生 checkbox，墨绿激活色 + 弹性滑块。
export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-qz-primary" : "bg-black/[0.14] dark:bg-white/[0.18]"
      )}
    >
      <motion.span
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-[2px] left-0 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
      />
    </button>
  );
}
