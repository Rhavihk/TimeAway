import { useEffect, useState } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ModeratorPage from "@/pages/ModeratorPage";
import AuthCallback from "@/pages/AuthCallback";

// ── Session helpers ──────────────────────────────────────────────────────────
export const getCurrentUser = () => {
  const raw = localStorage.getItem("timeaway_user");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};
export const setCurrentUser = (user) =>
  localStorage.setItem("timeaway_user", JSON.stringify(user));
export const removeCurrentUser = () =>
  localStorage.removeItem("timeaway_user");

export const getSiteAccess = () => localStorage.getItem("timeaway_site_access");
export const setSiteAccess = (val) =>
  localStorage.setItem("timeaway_site_access", val);
export const getModAccess = () => localStorage.getItem("timeaway_mod_access");
export const setModAccess = (val) =>
  localStorage.setItem("timeaway_mod_access", val);
export const getModPassword = () =>
  localStorage.getItem("timeaway_mod_password");
export const setModPassword = (val) =>
  localStorage.setItem("timeaway_mod_password", val);

// ── Route guards ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const user = getCurrentUser();
  const siteAccess = getSiteAccess();
  if (!siteAccess || !user) return <Navigate to="/login" replace />;
  return children;
};

const ModeratorRoute = ({ children }) => {
  const modAccess = getModAccess();
  if (!modAccess) return <Navigate to="/login" replace />;
  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <LanguageProvider>
      <div className="app-container">
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moderator"
              element={
                <ModeratorRoute>
                  <ModeratorPage />
                </ModeratorRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
        <Toaster position="top-center" theme="dark" />
      </div>
    </LanguageProvider>
  );
}

export default App;
