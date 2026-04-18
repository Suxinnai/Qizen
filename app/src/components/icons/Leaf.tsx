interface LeafProps {
  size?: number;
  rotate?: number;
  className?: string;
  stroke?: string;
  opacity?: number;
}

export function Leaf({
  size = 40,
  rotate = 0,
  className = "",
  stroke = "#2D7A6B",
  opacity = 1,
}: LeafProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, opacity }}
    >
      <path
        d="M20 5 Q 8 18, 12 32 Q 24 30, 30 18 Q 28 8, 20 5 Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
      />
      <path d="M20 8 L 20 30" stroke={stroke} strokeWidth="0.5" />
    </svg>
  );
}
