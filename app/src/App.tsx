import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./routes/Dashboard";
import Study from "./routes/Study";
import Goals from "./routes/Goals";
import Library from "./routes/Library";
import Graph from "./routes/Graph";
import Notes from "./routes/Notes";
import Settings from "./routes/Settings";
import Profile from "./routes/Profile";
import Reports from "./routes/Reports";
import Onboarding from "./routes/Onboarding";
import { loadAppData } from "./lib/storage";
import "./App.css";

function RequireOnboarding() {
  const data = loadAppData();
  if (!data.appState.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

function OnboardingEntry() {
  const data = loadAppData();
  if (data.appState.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Onboarding />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingEntry />} />
        <Route element={<RequireOnboarding />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/study" element={<Study />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/library" element={<Library />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
