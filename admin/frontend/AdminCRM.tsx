"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  Contacts as ContactsIcon,
  Business as BusinessIcon,
  QrCode as QrCodeIcon,
  ViewKanban as KanbanIcon,
  Tune as FieldsIcon,
  BugReport as BugReportIcon,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import Contacts from "./crm/Contacts";
import Clients from "./crm/Clients";
import AdminCompanies from "./AdminCompanies";
import QRCodesPage from "./qr/QRCodes";
import Pipeline from "./crm/Pipeline";
import Fields from "./crm/Fields";
import Client360 from "./crm/Client360";
import type { CustomFieldDefinition } from "./crm/types";
import { db, onValue, ref } from "../backend/services/Firebase";
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader";
import BugReportsPanel from "./reports/BugReportsPanel";
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell";

const AdminCRM: React.FC = () => {
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

  const canonicalSegmentForSlug = useCallback((slug: string) => {
    const raw = String(slug || "").trim()
    if (!raw) return ""
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [])

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);

  // Load fields once for Contacts component
  useEffect(() => {
    const fieldsRef = ref(db, `admin/crm/fields`);
    const unsub = onValue(
      fieldsRef,
      (snap) => {
        const val = snap.val() || {};
        const rows: CustomFieldDefinition[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          label: raw?.label || raw?.name || "",
          type: (raw?.type as any) || "text",
          options: Array.isArray(raw?.options) ? raw.options : [],
          required: Boolean(raw?.required),
          showInTable: Boolean(raw?.showInTable),
          appliesTo: raw?.appliesTo === "contacts" || raw?.appliesTo === "clients" || raw?.appliesTo === "both" ? raw.appliesTo : "both",
          order: typeof raw?.order === "number" ? raw.order : undefined,
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }));
        rows.sort((a, b) => {
          const ao = typeof a.order === "number" ? a.order : 9999;
          const bo = typeof b.order === "number" ? b.order : 9999;
          if (ao !== bo) return ao - bo;
          return String(a.label).localeCompare(String(b.label));
        });
        setFields(rows);
      },
    );
    return () => unsub();
  }, []);

  // Define tabs
  const tabs = useMemo(
    () => [
      {
        id: 0,
        label: "Contacts",
        slug: "contacts",
        icon: <ContactsIcon />,
        component: <Contacts fields={fields} />,
      },
      {
        id: 1,
        label: "Clients",
        slug: "clients",
        icon: <BusinessIcon />,
        component: <Clients fields={fields} />,
      },
      {
        id: 2,
        label: "Client 360",
        slug: "client360",
        icon: <BusinessIcon />,
        component: <Client360 />,
      },
      {
        id: 3,
        label: "Pipeline",
        slug: "pipeline",
        icon: <KanbanIcon />,
        component: <Pipeline />,
      },
      {
        id: 4,
        label: "Fields",
        slug: "fields",
        icon: <FieldsIcon />,
        component: <Fields />,
      },
      {
        id: 5,
        label: "Companies",
        slug: "companies",
        icon: <BusinessIcon />,
        component: <AdminCompanies />,
      },
      {
        id: 6,
        label: "QR Codes",
        slug: "qr",
        icon: <QrCodeIcon />,
        component: <QRCodesPage />,
      },
      {
        id: 7,
        label: "Bug reports",
        slug: "bugReports",
        icon: <BugReportIcon />,
        component: <BugReportsPanel embedded />,
      },
    ],
    [fields],
  );

  useEffect(() => {
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs.length, activeTab]);

  // Sync route with tab
  useEffect(() => {
    if (!tabs.length) {
      return;
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "");
    const pathLower = pathWithoutTrailingSlash.toLowerCase();

    const routeKey = `${pathLower}${location.search || ""}`.toLowerCase();

    const isSuppressed = suppressRouteSyncOnceRef.current === routeKey;
    if (isSuppressed) {
      suppressRouteSyncOnceRef.current = "";
    }

    if (lastRouteSyncPathRef.current === routeKey) {
      return;
    }
    lastRouteSyncPathRef.current = routeKey;

    const parts = pathWithoutTrailingSlash.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === "crm");
    const tabFromPath = idx !== -1 ? String(parts[idx + 1] || "") : "";
    const tabNorm = tabFromPath.toLowerCase().replace(/-/g, "")

    // Legacy ?tab= migration
    const params = new URLSearchParams(location.search || "");
    const legacyTabParam = String(params.get("tab") || "").toLowerCase();
    if (!tabFromPath && legacyTabParam) {
      const legacyClientId = String(params.get("clientId") || "").trim();
      const target =
        legacyTabParam === "client360" && legacyClientId
          ? `/CRM/Client360/${encodeURIComponent(legacyClientId)}${cleanSearch}`
          : `/CRM/${canonicalSegmentForSlug(legacyTabParam)}${cleanSearch}`;
      const targetKey = target.toLowerCase();
      if (!isSuppressed && routeKey !== targetKey) {
        suppressRouteSyncOnceRef.current = targetKey;
        navigate(target, { replace: true });
      }
      return;
    }

    // Migrate lowercase/hyphen path segments to PascalCase
    if (tabFromPath) {
      // Special: Client360 supports /CRM/Client360/:clientId
      const client360Match = tabNorm === "client360"
      const desiredSegment = client360Match ? "Client360" : canonicalSegmentForSlug(tabFromPath)
      const clientIdFromPath = client360Match ? String(parts[idx + 2] || "").trim() : ""
      const desiredPath = idx !== -1 ? `/CRM/${desiredSegment}${clientIdFromPath ? `/${encodeURIComponent(clientIdFromPath)}` : ""}` : ""
      const desiredKey = `${desiredPath}${cleanSearch}`.toLowerCase()
      const currentKey = `${pathWithoutTrailingSlash}${location.search || ""}`.toLowerCase()
      if (desiredPath && currentKey !== desiredKey && tabFromPath !== desiredSegment) {
        suppressRouteSyncOnceRef.current = desiredKey
        navigate(`${desiredPath}${cleanSearch}`, { replace: true })
        return
      }
    }

    if (tabFromPath) {
      const matchedIndex = tabs.findIndex((tab) => tab.slug.toLowerCase() === tabNorm || tab.slug.toLowerCase() === tabFromPath.toLowerCase());
      if (matchedIndex !== -1 && matchedIndex !== activeTab) {
        setActiveTab(matchedIndex);
        return;
      }
    }

    // Default to first tab if no match / missing tab segment.
    if (!tabFromPath) {
      const defaultPath = `/CRM/${canonicalSegmentForSlug(tabs[0].slug)}${cleanSearch}`;
      const defaultKey = defaultPath.toLowerCase();
      if (!isSuppressed && routeKey !== defaultKey) {
        suppressRouteSyncOnceRef.current = defaultKey;
        navigate(defaultPath, { replace: true });
      }
      if (activeTab !== 0) setActiveTab(0);
    }
  }, [activeTab, canonicalSegmentForSlug, cleanSearch, location.pathname, location.search, navigate, tabs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);

    const selectedTab = tabs[newValue];
    if (!selectedTab?.slug) {
      return;
    }

    const targetPath = `/CRM/${canonicalSegmentForSlug(selectedTab.slug)}${cleanSearch}`;
    const currentPath = location.pathname.replace(/\/+$/, "");
    const currentKey = `${currentPath}${location.search || ""}`.toLowerCase();
    const targetKey = targetPath.toLowerCase();
    if (currentKey !== targetKey) {
      suppressRouteSyncOnceRef.current = targetKey;
      navigate(targetPath);
    }
  };

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded);
  };

  return (
    <AdminPageShell title="CRM" sx={{ height: "100%" }}>
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <CollapsibleTabHeader
          layout="dataHeaderGap"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isExpanded={isTabsExpanded}
          onToggleExpanded={toggleTabsExpanded}
        />

        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            width: "100%",
            minHeight: 0,
          }}
        >
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

export default AdminCRM;
