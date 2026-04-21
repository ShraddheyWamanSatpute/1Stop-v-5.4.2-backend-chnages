import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material";
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell";

const AdminViewMode: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Enable support view mode while this page is open.
  // This allows admin staff to temporarily get "owner-like" viewing capabilities in the main app.
  useEffect(() => {
    try {
      localStorage.setItem("supportViewMode", "true");
    } catch {
      // ignore
    }
    return () => {
      try {
        localStorage.removeItem("supportViewMode");
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Auto-reload iframe when admin top-bar company selector changes.
  // AdminLayout dispatches a custom "admin-company-changed" event (StorageEvent
  // only fires in *other* tabs, not same page).
  useEffect(() => {
    const handler = () => {
      setReloadKey((k) => k + 1);
    };
    window.addEventListener("admin-company-changed", handler);
    return () => window.removeEventListener("admin-company-changed", handler);
  }, []);

  const iframeSrc = useMemo(() => "/App", []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      // ignore
    }
  };

  return (
    <AdminPageShell
      title="Support view"
      description="Open the main app inside an admin-safe support frame, with company switching and fullscreen tools that match the rest of the 1Stop admin experience."
      metrics={[
        { label: "Mode", value: isFullscreen ? "Fullscreen" : "Embedded", icon: <FullscreenIcon fontSize="small" /> },
        { label: "Reload state", value: reloadKey + 1, icon: <RefreshIcon fontSize="small" /> },
      ]}
      sx={{ height: "100%" }}
    >
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            width: "100%",
            borderRadius: 0,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              display: "flex",
              gap: 1,
              pointerEvents: "auto",
            }}
          >
            <Tooltip title="Reload embedded app">
              <IconButton size="small" onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open in new tab">
              <IconButton size="small" onClick={() => window.open(iframeSrc, "_blank", "noopener,noreferrer")}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <IconButton size="small" onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          <iframe
            key={`${iframeSrc}::${reloadKey}`}
            ref={iframeRef}
            title="Customer Service View"
            src={iframeSrc}
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </Box>
      </AdminSectionCard>
    </AdminPageShell>
  );
};

export default AdminViewMode;


