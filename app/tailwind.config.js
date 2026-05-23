/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Windows-oriented desktop palette
        qz: {
          primary: "#0067C0",
          light: "#7DA8D8",
          dark: "#375A7F",

          bg: "#FFFFFF",
          card: "#FFFFFF",
          chrome: "#F5F7FA",

          "bg-dark": "#202020",
          "card-dark": "#2B2B2B",
          "chrome-dark": "#191919",

          text: "#2D333B",
          "text-muted": "#7A8798",
          "text-strong": "#1F2328",

          "text-dark": "#F5F5F5",

          divider: "#E8EDF3",
          "divider-dark": "#3A3A3A",

          mastered: "#107C10",
          learning: "#CA5010",
          weak: "#D13438",

          info: "#0078D4",
        },
      },
      fontFamily: {
        // 衬线 - 用于品牌时刻、大标题、格言
        serif: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        // 无衬线 - 用于 UI、正文
        sans: [
          '"Segoe UI Variable"',
          '"Segoe UI"',
          '"Microsoft YaHei UI"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        qz: "10px",
      },
      boxShadow: {
        "qz-window": "0 12px 32px rgba(0,0,0,0.18)",
        "qz-card": "0 1px 2px rgba(15,23,42,0.04)",
        "qz-card-hover": "0 4px 14px rgba(15,23,42,0.06)",
        "qz-float": "0 10px 24px rgba(15,23,42,0.12)",
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
