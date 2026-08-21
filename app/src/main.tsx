import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { runSqliteShadowImportAtStartup } from "./lib/persistence/sqlite-shadow-import";

// Best-effort shadow migration: Electron copies the current normalized
// localStorage data into SQLite once, but localStorage remains the product's
// source of truth until the later repository-switch phase. Import failure must
// never block the UI from rendering.
void runSqliteShadowImportAtStartup();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
