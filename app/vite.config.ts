import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.VITE_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replaceAll("\\", "/");
          if (normalized.includes("pdfjs-dist")) return "pdf-tools";
          if (
            normalized.includes("node_modules/jszip") ||
            normalized.includes("node_modules/lie") ||
            normalized.includes("node_modules/pako") ||
            normalized.includes("node_modules/readable-stream") ||
            normalized.includes("node_modules/setimmediate")
          ) {
            return "doc-zip";
          }
          if (
            normalized.includes("mammoth") ||
            normalized.includes("node_modules/@xmldom") ||
            normalized.includes("node_modules/argparse") ||
            normalized.includes("node_modules/base64-js") ||
            normalized.includes("node_modules/bluebird") ||
            normalized.includes("node_modules/dingbat-to-unicode") ||
            normalized.includes("node_modules/lop") ||
            normalized.includes("node_modules/path-is-absolute") ||
            normalized.includes("node_modules/underscore") ||
            normalized.includes("node_modules/xmlbuilder")
          ) {
            return "doc-tools";
          }
          if (
            normalized.includes("framer-motion") ||
            normalized.includes("node_modules/motion-dom") ||
            normalized.includes("node_modules/motion-utils")
          ) {
            return "motion";
          }
          if (normalized.includes("node_modules/react-router")) return "router";
          if (
            normalized.includes("node_modules/react-dom") ||
            normalized.includes("node_modules/react/") ||
            normalized.includes("node_modules/scheduler")
          ) {
            return "react-core";
          }
          if (normalized.includes("node_modules/lucide-react")) return "icons";
          if (normalized.includes("node_modules/clsx") || normalized.includes("node_modules/tailwind-merge")) {
            return "ui-utils";
          }
          if (normalized.includes("node_modules")) return "vendor";
        },
      },
    },
  },

  // Keep a fixed localhost port so Electron can attach to Vite in dev mode.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**", "**/electron/**"],
    },
  },
}));
