import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  Campaign as MarketingIcon,
  Schedule as ContentIcon,
  Campaign as SocialIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../backend/context/AdminContext";
import { hasAdminPageAccess } from "../backend/AdminAccess";
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader";
import AdminSocial from "./AdminSocial";
import AdminMarketing from "./marketing/Marketing";
import AdminContentSchedule from "./content/ContentSchedule";
import MarketingSettings from "./marketing/Settings";
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell";

type TabDef = {
  label: string;
  slug: "social" | "marketing" | "content" | "settings";
  icon: React.ReactElement;
  component: React.ReactNode;
};

const canonicalSegment = (slug: string) => {
  const raw = String(slug || "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const AdminComms: React.FC = () => {
  const { state } = useAdmin();
  const user = state.user as any;
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [isTabsExpanded, setIsTabsExpanded] = useState(true);
  const lastRouteSyncPathRef = useRef<string>("");
  const suppressRouteSyncOnceRef = useRef<string>("");

  const cleanSearch = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    params.delete("tab");
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [location.search]);

  const tabs = useMemo(() => {
    const out: TabDef[] = [];

    if (hasAdminPageAccess(user, "social")) {
      out.push({ label: "Socials", slug: "social", icon: <SocialIcon />, component: <AdminSocial /> });
    }
    if (hasAdminPageAccess(user, "content")) {
      out.push({ label: "Content", slug: "content", icon: <ContentIcon />, component: <AdminContentSchedule /> });
    }
    if (hasAdminPageAccess(user, "marketing")) {
      out.push({ label: "Marketing", slug: "marketing", icon: <MarketingIcon />, component: <AdminMarketing /> });
    }
    if (
      hasAdminPageAccess(user, "marketing") ||
      hasAdminPageAccess(user, "content") ||
      hasAdminPageAccess(user, "social")
    ) {
      out.push({ label: "Settings", slug: "settings", icon: <SettingsIcon />, component: <MarketingSettings /> });
    }

    return out;
  }, [user]);

  useEffect(() => {
    if (activeTab >= tabs.length) setActiveTab(0);
  }, [activeTab, tabs.length]);

  useEffect(() => {
    if (!tabs.length) return;

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "");
    const pathLower = pathWithoutTrailingSlash.toLowerCase();
    const routeKey = `${pathLower}${location.search || ""}`.toLowerCase();

    const isSuppressed = suppressRouteSyncOnceRef.current === routeKey;
    if (isSuppressed) suppressRouteSyncOnceRef.current = "";

    if (lastRouteSyncPathRef.current === routeKey) {
      return;
    }
    lastRouteSyncPathRef.current = routeKey;

    const parts = pathWithoutTrailingSlash.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === "marketing");
    const tabFromPath = idx !== -1 ? String(parts[idx + 1] || "") : "";
    const tabNorm = tabFromPath.toLowerCase().replace(/-/g, "");

    const params = new URLSearchParams(location.search || "");
    const legacyTabParam = String(params.get("tab") || "").toLowerCase();
    if (!tabFromPath && legacyTabParam) {
      const target = `/Marketing/${canonicalSegment(legacyTabParam)}${cleanSearch}`;
      const targetKey = target.toLowerCase();
      if (routeKey !== targetKey) {
        suppressRouteSyncOnceRef.current = targetKey;
        navigate(target, { replace: true });
      }
      return;
    }

    if (tabFromPath) {
      const desired = canonicalSegment(tabFromPath);
      const desiredPath = `/Marketing/${desired}${cleanSearch}`;
      if (tabFromPath !== desired && routeKey !== desiredPath.toLowerCase()) {
        suppressRouteSyncOnceRef.current = desiredPath.toLowerCase();
        navigate(desiredPath, { replace: true });
        return;
      }
    }

    if (tabFromPath) {
      const matchedIndex = tabs.findIndex(
        (t) => t.slug.toLowerCase() === tabNorm || t.slug.toLowerCase() === tabFromPath.toLowerCase(),
      );
      if (matchedIndex !== -1 && matchedIndex !== activeTab) {
        setActiveTab(matchedIndex);
        return;
      }
    }

    const first = tabs[0];
    if (first && !tabFromPath) {
      const target = `/Marketing/${canonicalSegment(first.slug)}${cleanSearch}`;
      const targetKey = target.toLowerCase();
      suppressRouteSyncOnceRef.current = targetKey;
      navigate(target, { replace: true });
    }
  }, [activeTab, cleanSearch, location.pathname, location.search, navigate, tabs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const selected = tabs[newValue];
    if (!selected) return;
    const target = `/Marketing/${canonicalSegment(selected.slug)}${cleanSearch}`;
    suppressRouteSyncOnceRef.current = target.toLowerCase();
    navigate(target);
  };

  const toggleTabsExpanded = () => {
    setIsTabsExpanded((p) => !p);
  };

  if (!tabs.length) {
    return (
      <AdminPageShell
        title="Marketing"
        description="Campaign planning, social publishing, and content scheduling now share the same admin theme and workspace shell."
        metrics={[{ label: "Visible sections", value: 0, icon: <MarketingIcon fontSize="small" /> }]}
      >
        <AdminSectionCard title="No access" description="Your account needs at least one marketing permission to open this workspace.">
          <Typography color="text.secondary">You don&apos;t currently have access to Social, Content, or Marketing.</Typography>
        </AdminSectionCard>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Marketing" sx={{ height: "100%" }}>
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <CollapsibleTabHeader
          layout="dataHeaderGap"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isExpanded={isTabsExpanded}
          onToggleExpanded={toggleTabsExpanded}
        />

        <Box sx={{ flexGrow: 1, overflow: "auto", width: "100%", minHeight: 0 }}>
          {tabs.map((tab, index) => (
            <Box key={tab.slug || index} sx={{ display: index === activeTab ? "block" : "none", height: "100%" }}>
              {tab.component}
            </Box>
          ))}
        </Box>
      </AdminSectionCard>
    </AdminPageShell>
  );
};

export default AdminComms;
