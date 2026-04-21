import React from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import App from "./App";
import "./frontend/styles/global.css";
import { CompanyProvider } from "./backend/context/CompanyContext";
import { SettingsProvider } from "./backend/context/SettingsContext";
import { AdminProvider } from "../admin/backend/context/AdminContext";
import { LazyContextProvider } from "./frontend/components/global/LazyContextProvider";
import AppErrorBoundary from "./frontend/components/global/AppErrorBoundary";
import AppThemeProvider from "./theme/AppTheme";

function RootProviders({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname || "";

  // Admin routes should NOT mount main app Company/Lazy providers.
  const isAdminShell =
    path.startsWith("/Admin") ||
    path.startsWith("/AdminLogin") ||
    path.startsWith("/AdminRegister") ||
    path.startsWith("/AdminInvite") ||
    path.startsWith("/Staff") ||
    path.startsWith("/OAuth") ||
    path.startsWith("/HMRC");

  const isYourStopShell = path.startsWith("/yourstop") || path.startsWith("/YourStop");

  // YourStop should be fully isolated from main app providers/layout.
  if (isYourStopShell) return <>{children}</>;

  // Admin routes need AdminProvider but not CompanyProvider
  if (isAdminShell) {
    return <AdminProvider>{children}</AdminProvider>;
  }

  return (
    <CompanyProvider>
      <LazyContextProvider>{children}</LazyContextProvider>
    </CompanyProvider>
  );
}

export default function AppEntry() {
  return (
    <AppThemeProvider>
      <AppErrorBoundary>
        <BrowserRouter
          basename="/App"
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
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
