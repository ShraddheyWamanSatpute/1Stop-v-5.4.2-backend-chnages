import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { GlobalLoader } from "./app/backend/shared/GlobalLoader";

const container = document.getElementById("root");

// Store root instance to prevent duplicate creation during HMR
let root: ReturnType<typeof ReactDOM.createRoot> | null = null;

// IMPORTANT:
// Lazy-load shell entry points so their global CSS does not load unless needed.
// (e.g. `main-site/main` imports `main-site/index.css`, which can bleed into /App if imported eagerly.)
const MainSiteEntry = lazy(() => import("./main-site/main"));
const AppEntry = lazy(() => import("./app/main"));
const AdminEntry = lazy(() => import("./admin/main"));
const MobileEntry = lazy(() => import("./mobile/main"));

function installLocationChangeEventsOnce() {
  const w = window as any;
  if (w.__onestop_location_events_installed) return;
  w.__onestop_location_events_installed = true;

  const notify = () => window.dispatchEvent(new Event("locationchange"));

  window.addEventListener("popstate", notify);

  const { pushState, replaceState } = window.history;
  window.history.pushState = function (...args) {
    const ret = pushState.apply(this, args as any);
    notify();
    return ret;
  };
  window.history.replaceState = function (...args) {
    const ret = replaceState.apply(this, args as any);
    notify();
    return ret;
  };
}

function usePathname() {
  const [pathname, setPathname] = React.useState(() => window.location.pathname);

  React.useEffect(() => {
    installLocationChangeEventsOnce();
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener("locationchange", handler);
    return () => window.removeEventListener("locationchange", handler);
  }, []);

  return pathname;
}

function RootApp() {
  const pathname = usePathname();
  const isToolsPath = pathname.startsWith("/Tools") || pathname.startsWith("/tools");
  // App shell routes:
  // - /App/* is the canonical basename
  // - /Tools/* is treated as an App route to avoid accidentally mounting main-site
  //   (Smoke tests + internal tools live in the App, not the marketing site)
  const isAppPath =
    pathname.startsWith("/App") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/Tools") ||
    pathname.startsWith("/tools");
  const isAdminPath = pathname.startsWith("/Admin") || pathname.startsWith("/admin");
  const isMobilePath = pathname.startsWith("/Mobile") || pathname.startsWith("/mobile") || pathname.startsWith("/ESS") || pathname.startsWith("/ess");
  
  // If a user hits /Tools/* directly, redirect to the canonical /App/Tools/*
  // so the App BrowserRouter basename="/App" works correctly.
  React.useEffect(() => {
    if (isToolsPath && !pathname.startsWith("/App") && !pathname.startsWith("/app")) {
      const next = `/App${pathname.startsWith("/") ? "" : "/"}${pathname}`;
      window.history.replaceState({}, "", next);
      window.dispatchEvent(new Event("locationchange"));
    }
  }, [isToolsPath, pathname]);

  if (isToolsPath && !pathname.startsWith("/App") && !pathname.startsWith("/app")) {
    return <GlobalLoader message="Loading 1Stop..." />;
  }

  // If someone ends up at /App/Mobile/* or /App/ESS/* (e.g. navigation from inside the /App router),
  // normalize to the canonical top-level shells so we mount the correct bundle.
  React.useEffect(() => {
    const p = pathname || "";
    const isNestedMobile =
      p.startsWith("/App/Mobile") || p.startsWith("/app/Mobile") || p.startsWith("/App/mobile") || p.startsWith("/app/mobile");
    const isNestedESS =
      p.startsWith("/App/ESS") || p.startsWith("/app/ESS") || p.startsWith("/App/ess") || p.startsWith("/app/ess");

    if (isNestedMobile) {
      const next = p.replace(/^\/app/i, "");
      window.history.replaceState({}, "", next);
      window.dispatchEvent(new Event("locationchange"));
      return;
    }
    if (isNestedESS) {
      const next = p.replace(/^\/app/i, "");
      window.history.replaceState({}, "", next);
      window.dispatchEvent(new Event("locationchange"));
    }
  }, [pathname]);

  if (isAdminPath) {
    return <AdminEntry />;
  }
  
  if (isMobilePath) {
    return <MobileEntry />;
  }
  
  if (isAppPath) {
    return <AppEntry />;
  }
  
  return <MainSiteEntry />;
}

if (container) {
  // Reuse existing root if it exists (for HMR support)
  if (!root) {
    root = ReactDOM.createRoot(container);
  }
  
  // Wrap in Suspense to show loading screen during initial load and lazy loading
  root.render(
    <React.StrictMode>
      <Suspense fallback={<GlobalLoader message="Loading 1Stop..." />}>
        <RootApp />
      </Suspense>
    </React.StrictMode>
  );
} else {
  console.error("Root container not found");
}
