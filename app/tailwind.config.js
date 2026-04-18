/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 栖知 DNA 配色
        qz: {
          // 主色
          primary: "#2D7A6B",     // 栖知青
          light: "#5BA593",       // 浅栖知
          dark: "#1A5448",        // 深栖知

          // 背景
          bg: "#FBFAF7",          // 米白底
          card: "#FFFFFF",        // 卡片白
          chrome: "#E8E6E1",      // 窗口外层

          // 暗模式
          "bg-dark": "#141413",
          "card-dark": "#2A2A28",
          "chrome-dark": "#0E0E0D",

          // 文字
          text: "#3A3833",
          "text-muted": "#8A8478",
          "text-strong": "#1A1916",

          // 暗模式文字
          "text-dark": "#DDD8CE",

          // 分隔
          divider: "#EFEDE8",
          "divider-dark": "#2A2A28",

          // 节点色
          mastered: "#4CAF7C",
          learning: "#E8A93C",
          weak: "#D85959",

          // 语义色
          info: "#5B8DEF",
        },
      },
      fontFamily: {
        // 衬线 - 用于品牌时刻、大标题、格言
        serif: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        // 无衬线 - 用于 UI、正文
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"PingFang SC"',
          '"HarmonyOS Sans"',
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        qz: "12px", // 卡片标准圆角
      },
      boxShadow: {
        "qz-window": "0 20px 60px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.08)",
        "qz-card": "0 1px 3px rgba(0,0,0,0.04)",
        "qz-card-hover": "0 4px 12px rgba(0,0,0,0.08)",
        "qz-float": "0 12px 32px rgba(0,0,0,0.12)",
      },
      animation: {
        "ling-breath": "ling-breath 3s ease-in-out infinite",
      },
      keyframes: {
        "ling-breath": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.02)", opacity: "0.95" },
        },
      },
    },
  },
  plugins: [],
};
