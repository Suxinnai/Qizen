interface LingIconProps {
  size?: number;
}

export function LingIcon({ size = 24 }: LingIconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <defs>
        <radialGradient id="lingGlow">
          <stop offset="0%" stopColor="#5BA593" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2D7A6B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#lingGlow)" />
      <path
        d="M16 6 C 12 10, 10 14, 12 20 C 14 24, 18 24, 20 20 C 22 14, 20 10, 16 6 Z"
        fill="#2D7A6B"
        opacity="0.85"
      />
      <line
        x1="16"
        y1="14"
        x2="16"
        y2="22"
        stroke="#FFFFFF"
        strokeWidth="0.5"
        opacity="0.6"
      />
    </svg>
  );
}
