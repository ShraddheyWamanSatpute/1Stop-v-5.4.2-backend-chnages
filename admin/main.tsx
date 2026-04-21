import React from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import App from "./App";
import "../app/frontend/styles/global.css";
import { AdminProvider } from "./backend/context/AdminContext";
import { SettingsProvider } from "../app/backend/context/SettingsContext";
import AppErrorBoundary from "../app/frontend/components/global/AppErrorBoundary";
import AppThemeProvider from "../app/backend/context/AppTheme";

function RootProviders({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = (location.pathname || "").toLowerCase();

  const isAdminAuthRoute =
    path.endsWith("/adminlogin") ||
    path.endsWith("/adminregister") ||
    path.endsWith("/resetpassword") ||
    path.includes("/admininvite/");

  // Auth/invite pages don’t need AdminContext. Skipping it reduces bootstrap work.
  if (isAdminAuthRoute) return <>{children}</>;

  return <AdminProvider>{children}</AdminProvider>;
}

export default function AdminEntry() {
  return (
    <AppThemeProvider>
      <AppErrorBoundary>
        <BrowserRouter basename="/Admin" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SettingsProvider>
            <RootProviders>
              <App />
            </RootProviders>
          </SettingsProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </AppThemeProvider>
  );
}
