import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "../app/frontend/styles/global.css";
import "./mobile.css";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { SettingsProvider } from "../app/backend/context/SettingsContext";
import { CompanyProvider } from "../app/backend/context/CompanyContext";
import MobileProviders from "./MobileProviders";
import AppErrorBoundary from "../app/frontend/components/global/AppErrorBoundary";
import { theme } from "../app/backend/context/AppTheme";

export default function MobileEntry() {
  const basename =
    typeof window !== "undefined" && window.location.pathname.startsWith("/ESS")
      ? "/ESS"
      : "/Mobile"

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
        <BrowserRouter
          basename={basename}
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <SettingsProvider>
            <CompanyProvider>
              <MobileProviders>
                <App />
              </MobileProviders>
            </CompanyProvider>
          </SettingsProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
