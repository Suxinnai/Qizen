import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./routes/Dashboard";
import Study from "./routes/Study";
import Goals from "./routes/Goals";
import Library from "./routes/Library";
import Graph from "./routes/Graph";
import Notes from "./routes/Notes";
import Settings from "./routes/Settings";
import "./App.css";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/study" element={<Study />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/library" element={<Library />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
