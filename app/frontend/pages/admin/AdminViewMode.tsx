import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

function normalizePath(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "/Dashboard";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

const AdminViewMode: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [controlsOpen, setControlsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pathInput, setPathInput] = useState("/Dashboard");
  const [committedPath, setCommittedPath] = useState("/Dashboard");
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

  const iframeSrc = useMemo(() => {
    const normalized = normalizePath(committedPath);
    // Prevent recursive embedding of /admin inside admin view mode.
    if (typeof normalized === "string" && normalized.toLowerCase().startsWith("/admin")) {
      return "/Dashboard";
    }
    return normalized;
  }, [committedPath]);

  const blocked = useMemo(() => normalizePath(pathInput).toLowerCase().startsWith("/admin"), [pathInput]);

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

  const quickLinks: Array<{ label: string; path: string }> = [
    { label: "Dashboard", path: "/Dashboard" },
    { label: "Company", path: "/Company" },
    { label: "HR", path: "/HR" },
    { label: "Bookings", path: "/Bookings" },
    { label: "POS", path: "/POS" },
    { label: "Finance", path: "/Finance" },
    { label: "Messenger", path: "/Messenger" },
    { label: "Settings", path: "/Settings" },
  ];

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
        p: 2,
      }}
    >
      {controlsOpen && (
        <Box
          sx={{
            width: { xs: "100%", md: 380 },
            flex: { xs: "0 0 auto", md: "0 0 auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <VisibilityIcon color="action" />
            <Typography variant="h6">View Mode</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <IconButton onClick={toggleFullscreen} size="small">
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Hide controls">
              <IconButton onClick={() => setControlsOpen(false)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="body2" color="text.secondary">
            This embeds the main app for customer service. Use fullscreen to focus on the customer view.
          </Typography>

          <Divider />

          <TextField
            label="Path (or full URL)"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            helperText={blocked ? "Admin routes are blocked in view mode." : "Example: /Company or /HR"}
            error={blocked}
            size="small"
          />

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              disabled={blocked}
              onClick={() => setCommittedPath(normalizePath(pathInput))}
            >
              Go
            </Button>
            <Tooltip title="Reload embedded app">
              <IconButton onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open in new tab">
              <IconButton onClick={() => window.open(iframeSrc, "_blank", "noopener,noreferrer")}>
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Quick links
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {quickLinks.map((q) => (
              <Button
                key={q.path}
                size="small"
                variant="outlined"
                onClick={() => {
                  setPathInput(q.path);
                  setCommittedPath(q.path);
                }}
              >
                {q.label}
              </Button>
            ))}
          </Box>

          <Alert severity="info">
            Tip: company/site selection is shared via localStorage, so switching company in the admin header should
            also affect what loads in the embedded app.
          </Alert>
        </Box>
      )}

      {!controlsOpen && (
        <Box sx={{ position: "fixed", top: 84, left: 16, zIndex: 1300 }}>
          <Button variant="contained" size="small" onClick={() => setControlsOpen(true)}>
            Show controls
          </Button>
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, height: "100%" }}>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <iframe
            key={`${iframeSrc}::${reloadKey}`}
            ref={iframeRef}
            title="Customer Service View"
            src={iframeSrc}
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminViewMode;

