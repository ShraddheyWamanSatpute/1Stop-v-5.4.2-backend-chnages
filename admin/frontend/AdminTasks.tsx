"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  Assignment as AssignmentIcon,
  Folder as FolderIcon,
  NoteAlt as NotesIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import Tasks from "./tasks/Tasks";
import Projects from "./tasks/Projects";
import NotesPage from "./notes/Notes";
import TasksSettings from "./tasks/Settings";
import type { CustomFieldDefinition } from "./tasks/types";
import { db, onValue, ref } from "../backend/services/Firebase";
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader";
import type { StaffProfile } from "./shared/models";
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell";

const canonicalSegment = (slug: string) => {
  const raw = String(slug || "").trim()
  if (!raw) return ""
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

interface AdminProjectLite {
  id: string;
  name: string;
}

type ClientLite = { id: string; name: string }

const AdminTasks: React.FC = () => {
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

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [projects, setProjects] = useState<AdminProjectLite[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([])
  const [staff, setStaff] = useState<Array<Pick<StaffProfile, "uid" | "email" | "displayName">>>([])
  const projectsCreateRef = useRef<(() => void) | null>(null);

  // Load fields once for Tasks component
  useEffect(() => {
    const fieldsRef = ref(db, `admin/tasks/fields`);
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

  // Load projects once for Tasks and Projects components
  useEffect(() => {
    const projectsRef = ref(db, `admin/projects`);
    const unsub = onValue(projectsRef, (snap) => {
      const val = snap.val() || {};
      const rows: AdminProjectLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || "Untitled",
      }));
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setProjects(rows);
    });
    return () => unsub();
  }, []);

  // Load CRM clients for linking
  useEffect(() => {
    const clientsRef = ref(db, `admin/crm/clients`)
    const unsub = onValue(clientsRef, (snap) => {
      const val = snap.val() || {}
      const rows: ClientLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: raw?.name || raw?.companyName || "Client",
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setClients(rows)
    })
    return () => unsub()
  }, [])

  // Load admin staff for assignment/ownership
  useEffect(() => {
    const staffRef = ref(db, "admin/staff")
    const unsub = onValue(staffRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([uid, raw]: any) => ({
        uid: String(uid),
        email: raw?.email || "",
        displayName: raw?.displayName || raw?.name || "",
      }))
      rows.sort((a, b) => String(a.displayName || a.email || a.uid).localeCompare(String(b.displayName || b.email || b.uid)))
      setStaff(rows as any)
    })
    return () => unsub()
  }, [])

  // Define tabs
  const tabs = useMemo(
    () => [
      {
        id: 0,
        label: "Tasks",
        slug: "tasks",
        icon: <AssignmentIcon />,
        component: <Tasks fields={fields} projects={projects} clients={clients} staff={staff} />,
      },
      {
        id: 1,
        label: "Projects",
        slug: "projects",
        icon: <FolderIcon />,
        component: (
          <Projects
            embed
            fields={fields}
            createHandlerRef={projectsCreateRef}
            clients={clients}
            staff={staff}
          />
        ),
      },
      {
        id: 2,
        label: "Notes",
        slug: "notes",
        icon: <NotesIcon />,
        component: <NotesPage />,
      },
      {
        id: 3,
        label: "Settings",
        slug: "settings",
        icon: <SettingsIcon />,
        component: <TasksSettings fields={fields} />,
      },
    ],
    [clients, fields, projects, staff],
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
    const idx = parts.findIndex((p) => p.toLowerCase() === "tasks");
    const tabFromPath = idx !== -1 ? String(parts[idx + 1] || "") : "";
    const tabNorm = tabFromPath.toLowerCase().replace(/-/g, "")

    // Legacy ?tab= migration
    const params = new URLSearchParams(location.search || "");
    const legacyTabParam = String(params.get("tab") || "").toLowerCase();
    if (!tabFromPath && legacyTabParam) {
      const target = `/Tasks/${canonicalSegment(legacyTabParam)}${cleanSearch}`;
      const targetKey = target.toLowerCase();
      if (!isSuppressed && routeKey !== targetKey) {
        suppressRouteSyncOnceRef.current = targetKey;
        navigate(target, { replace: true });
      }
      return;
    }

    // Migrate lowercase/hyphen segments to PascalCase
    if (tabFromPath) {
      const desired = canonicalSegment(tabFromPath)
      const desiredPath = `/Tasks/${desired}${cleanSearch}`
      const currentKey = `${pathWithoutTrailingSlash}${location.search || ""}`.toLowerCase()
      if (!isSuppressed && tabFromPath !== desired && currentKey !== desiredPath.toLowerCase()) {
        suppressRouteSyncOnceRef.current = desiredPath.toLowerCase()
        navigate(desiredPath, { replace: true })
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
      const defaultPath = `/Tasks/${canonicalSegment(tabs[0].slug)}${cleanSearch}`;
      const defaultKey = defaultPath.toLowerCase();
      if (!isSuppressed && routeKey !== defaultKey) {
        suppressRouteSyncOnceRef.current = defaultKey;
        navigate(defaultPath, { replace: true });
      }
      if (activeTab !== 0) setActiveTab(0);
    }
  }, [activeTab, cleanSearch, location.pathname, location.search, navigate, tabs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);

    const selectedTab = tabs[newValue];
    if (!selectedTab?.slug) {
      return;
    }

    const targetPath = `/Tasks/${canonicalSegment(selectedTab.slug)}${cleanSearch}`;
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
    <AdminPageShell title="Organisation" sx={{ height: "100%" }}>
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

export default AdminTasks;
