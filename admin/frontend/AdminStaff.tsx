import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useAdmin } from "../backend/context/AdminContext";
import { APP_KEYS, getFunctionsBaseUrl } from "../backend/config/keys";
import { auth, db, onValue, push, ref, remove, set, update } from "../backend/services/Firebase";
import type { AdminPageKey } from "../backend/AdminAccess";
import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Groups as StaffIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  WorkOutline as PositionsTabIcon,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import DataHeader from "../../app/frontend/components/reusable/DataHeader";
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../app/frontend/components/reusable/CRUDModal";
import EmptyStateCard from "../../app/frontend/components/reusable/EmptyStateCard";
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader";
import StaffPositions from "./staff/StaffPositions";
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell";

const POSITIONS_PATH = "admin/staffPositions";

const PAGE_KEYS: AdminPageKey[] = [
  "viewer",
  "crm",
  "tasks",
  "calendar",
  "integrations",
  "social",
  "content",
  "marketing",
  "email",
  "referrals",
  "createCompany",
  "createAdmin",
  "staff",
  "analytics",
  "ops",
];

type StaffRow = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  status: "not_invited" | "invited" | "active";
  pages: Record<string, boolean>;
  opsPerms?: {
    request?: boolean;
    approveTest?: boolean;
    approveProd?: boolean;
    process?: boolean;
    syncProviders?: boolean;
    manageAuthEmails?: boolean;
  };
  inviteId?: string;
  inviteLink?: string;
  claimed?: boolean;
  claimedBy?: string;
  uid?: string;
  expiresAt?: number;
  createdAt: number;
};

export default function AdminStaff() {
  const {} = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);
  const [isTabsExpanded, setIsTabsExpanded] = useState(true);
  const lastRouteSyncPathRef = useRef<string>("");
  const suppressRouteSyncOnceRef = useRef<string>("");

  const cleanSearch = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [location.search]);

  const [employees, setEmployees] = useState<Record<string, any>>({});
  const [staff, setStaff] = useState<Record<string, any>>({});
  const [invites, setInvites] = useState<Record<string, any>>({});
  const [positionsById, setPositionsById] = useState<Record<string, { name?: string }>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Employee CRUD modal
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create");
  const [selectedEmployee, setSelectedEmployee] = useState<StaffRow | null>(null);
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    pages: {} as Record<string, boolean>,
    opsPerms: {
      request: false,
      approveTest: false,
      approveProd: false,
      process: false,
      syncProviders: false,
      manageAuthEmails: false,
    } as Record<string, boolean>,
  });

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<StaffRow | null>(null);
  const [invitePages, setInvitePages] = useState<Record<string, boolean>>({});
  const [inviteOpsPerms, setInviteOpsPerms] = useState<Record<string, boolean>>({
    request: false,
    approveTest: false,
    approveProd: false,
    process: false,
    syncProviders: false,
    manageAuthEmails: false,
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  // Data loading
  useEffect(() => {
    const empRef = ref(db, "admin/staffEmployees");
    const staffRef = ref(db, "admin/staff");
    const invRef = ref(db, "admin/staffInvites");
    const posRef = ref(db, POSITIONS_PATH);
    const unsub1 = onValue(empRef, (snap) => setEmployees(snap.val() || {}));
    const unsub2 = onValue(staffRef, (snap) => setStaff(snap.val() || {}));
    const unsub3 = onValue(invRef, (snap) => setInvites(snap.val() || {}));
    const unsub4 = onValue(posRef, (snap) => setPositionsById(snap.val() || {}));
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const positionNameOptions = useMemo(() => {
    const names = new Set<string>();
    Object.values(positionsById || {}).forEach((raw: any) => {
      const n = String(raw?.name || "").trim();
      if (n) names.add(n);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [positionsById]);

  const sectionTabs = useMemo(
    () => [
      { label: "Employees", slug: "employees", icon: <StaffIcon /> },
      { label: "Positions", slug: "positions", icon: <PositionsTabIcon /> },
    ],
    [],
  );

  const canonicalSegment = (slug: string) => {
    const raw = String(slug || "").trim();
    if (!raw) return "";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  useEffect(() => {
    if (activeSection >= sectionTabs.length) setActiveSection(0);
  }, [activeSection, sectionTabs.length]);

  useEffect(() => {
    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "");
    const pathLower = pathWithoutTrailingSlash.toLowerCase();
    const routeKey = `${pathLower}${location.search || ""}`.toLowerCase();

    const isSuppressed = suppressRouteSyncOnceRef.current === routeKey;
    if (isSuppressed) suppressRouteSyncOnceRef.current = "";

    if (lastRouteSyncPathRef.current === routeKey) return;
    lastRouteSyncPathRef.current = routeKey;

    const parts = pathWithoutTrailingSlash.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === "staff");
    const tabFromPath = idx !== -1 ? String(parts[idx + 1] || "") : "";
    const tabNorm = tabFromPath.toLowerCase().replace(/-/g, "");

    if (tabFromPath) {
      const desired = canonicalSegment(tabFromPath);
      const desiredPath = `/Staff/${desired}${cleanSearch}`;
      const currentKey = `${pathWithoutTrailingSlash}${location.search || ""}`.toLowerCase();
      if (!isSuppressed && tabFromPath !== desired && currentKey !== desiredPath.toLowerCase()) {
        suppressRouteSyncOnceRef.current = desiredPath.toLowerCase();
        navigate(desiredPath, { replace: true });
        return;
      }
    }

    if (tabFromPath) {
      const matchedIndex = sectionTabs.findIndex(
        (t) => t.slug.toLowerCase() === tabNorm || t.slug.toLowerCase() === tabFromPath.toLowerCase(),
      );
      if (matchedIndex !== -1 && matchedIndex !== activeSection) {
        setActiveSection(matchedIndex);
        return;
      }
    }

    if (!tabFromPath && sectionTabs[0]) {
      const defaultPath = `/Staff/${canonicalSegment(sectionTabs[0].slug)}${cleanSearch}`;
      const defaultKey = defaultPath.toLowerCase();
      if (!isSuppressed && routeKey !== defaultKey) {
        suppressRouteSyncOnceRef.current = defaultKey;
        navigate(defaultPath, { replace: true });
      }
      if (activeSection !== 0) setActiveSection(0);
    }
  }, [activeSection, cleanSearch, location.pathname, location.search, navigate, sectionTabs]);

  const handleSectionTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSection(newValue);
    const selected = sectionTabs[newValue];
    if (!selected?.slug) return;
    const targetPath = `/Staff/${canonicalSegment(selected.slug)}${cleanSearch}`;
    const currentPath = location.pathname.replace(/\/+$/, "");
    const currentKey = `${currentPath}${location.search || ""}`.toLowerCase();
    const targetKey = targetPath.toLowerCase();
    if (currentKey !== targetKey) {
      suppressRouteSyncOnceRef.current = targetKey;
      navigate(targetPath);
    }
  };

  const toggleTabsExpanded = useCallback(() => {
    setIsTabsExpanded((p) => !p);
  }, []);

  // Build unified rows from employees + invites + active staff
  const allRows = useMemo<StaffRow[]>(() => {
    const rows: StaffRow[] = [];

    // Index invites by email for matching
    const inviteByEmail = new Map<string, { id: string; data: any }>();
    Object.entries(invites || {}).forEach(([id, inv]: any) => {
      const email = String(inv?.email || "").trim().toLowerCase();
      if (email) inviteByEmail.set(email, { id, data: inv });
    });

    // Index active staff by email
    const staffByEmail = new Map<string, { uid: string; data: any }>();
    Object.entries(staff || {}).forEach(([uid, s]: any) => {
      const email = String(s?.email || "").trim().toLowerCase();
      if (email) staffByEmail.set(email, { uid, data: s });
    });

    const seenEmails = new Set<string>();

    // Employees first
    Object.entries(employees || {}).forEach(([id, emp]: any) => {
      const email = String(emp?.email || "").trim().toLowerCase();
      seenEmails.add(email);

      const inv = email ? inviteByEmail.get(email) : undefined;
      const act = email ? staffByEmail.get(email) : undefined;

      let status: StaffRow["status"] = "not_invited";
      let pages: Record<string, boolean> = emp?.pages || {};
      let inviteId: string | undefined;
      let claimed = false;
      let claimedBy: string | undefined;
      let uid: string | undefined;
      let expiresAt: number | undefined;
      let opsPerms: StaffRow["opsPerms"];

      if (act) {
        status = "active";
        pages = act.data?.pages || emp?.pages || {};
        uid = act.uid;
        // Prefer active staff record perms
        const op = act.data?.permissions?.ops || act.data?.opsPerms || null;
        if (op && typeof op === "object") opsPerms = op;
      } else if (inv) {
        status = "invited";
        pages = inv.data?.pages || emp?.pages || {};
        inviteId = inv.id;
        claimed = Boolean(inv.data?.claimed);
        claimedBy = inv.data?.claimedBy || "";
        expiresAt = inv.data?.expiresAt || 0;
        const op = inv.data?.opsPerms || null;
        if (op && typeof op === "object") opsPerms = op;
      }

      rows.push({
        employeeId: id,
        firstName: String(emp?.firstName || ""),
        lastName: String(emp?.lastName || ""),
        email: String(emp?.email || ""),
        position: String(emp?.position || ""),
        status,
        pages,
        opsPerms: opsPerms && typeof opsPerms === "object" ? opsPerms : undefined,
        inviteId,
        claimed,
        claimedBy,
        uid,
        expiresAt,
        createdAt: Number(emp?.createdAt || 0),
      });
    });

    // Invites without a matching employee record
    Object.entries(invites || {}).forEach(([id, inv]: any) => {
      const email = String(inv?.email || "").trim().toLowerCase();
      if (seenEmails.has(email)) return;
      seenEmails.add(email);

      const act = email ? staffByEmail.get(email) : undefined;
      rows.push({
        employeeId: "",
        firstName: "",
        lastName: "",
        email: String(inv?.email || ""),
        position: "",
        status: act ? "active" : "invited",
        pages: act ? act.data?.pages || {} : inv?.pages || {},
        opsPerms: act ? act.data?.permissions?.ops || undefined : inv?.opsPerms || undefined,
        inviteId: id,
        claimed: Boolean(inv?.claimed),
        claimedBy: inv?.claimedBy || "",
        uid: act?.uid,
        expiresAt: inv?.expiresAt || 0,
        createdAt: Number(inv?.createdAt || 0),
      });
    });

    // Active staff without employee or invite record
    Object.entries(staff || {}).forEach(([uid, s]: any) => {
      const email = String(s?.email || "").trim().toLowerCase();
      if (seenEmails.has(email)) return;
      seenEmails.add(email);
      rows.push({
        employeeId: "",
        firstName: "",
        lastName: "",
        email: String(s?.email || ""),
        position: "",
        status: "active",
        pages: s?.pages || {},
        opsPerms: s?.permissions?.ops || undefined,
        uid,
        createdAt: Number(s?.createdAt || 0),
      });
    });

    return rows;
  }, [employees, staff, invites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows
      .filter((r) => {
        if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
        if (!q) return true;
        return (
          r.email.toLowerCase().includes(q) ||
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.position.toLowerCase().includes(q) ||
          r.status.includes(q)
        );
      })
      .sort((a, b) => {
        const order = { active: 0, invited: 1, not_invited: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        const nameA = `${a.firstName} ${a.lastName}`.trim() || a.email;
        const nameB = `${b.firstName} ${b.lastName}`.trim() || b.email;
        return nameA.localeCompare(nameB);
      });
  }, [allRows, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "position", label: "Position" },
    { key: "status", label: "Status" },
    { key: "permissions", label: "Permissions" },
    { key: "actions", label: "Actions" },
  ];

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const c of columns) {
        if (next[c.key] === undefined) next[c.key] = true;
      }
      return next;
    });
  }, []);

  // Employee CRUD
  const defaultPages = useCallback(() => {
    const out: Record<string, boolean> = {};
    PAGE_KEYS.forEach((k) => (out[k] = false));
    out.viewer = true;
    return out;
  }, []);

  const defaultOpsPerms = useCallback(() => {
    return {
      request: true,
      approveTest: false,
      approveProd: false,
      process: false,
      syncProviders: false,
      manageAuthEmails: false,
    } as Record<string, boolean>;
  }, []);

  const openCreate = useCallback(() => {
    setSelectedEmployee(null);
    setDraft({ firstName: "", lastName: "", email: "", position: "", pages: defaultPages(), opsPerms: defaultOpsPerms() });
    setCrudMode("create");
    setCrudOpen(true);
  }, [defaultPages, defaultOpsPerms]);

  const openView = useCallback((row: StaffRow) => {
    setSelectedEmployee(row);
    setDraft({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      position: row.position,
      pages: { ...row.pages },
      opsPerms: { ...defaultOpsPerms(), ...(row.opsPerms || {}) },
    });
    setCrudMode("view");
    setCrudOpen(true);
  }, [defaultOpsPerms]);

  const openEdit = useCallback((row: StaffRow) => {
    setSelectedEmployee(row);
    setDraft({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      position: row.position,
      pages: { ...row.pages },
      opsPerms: { ...defaultOpsPerms(), ...(row.opsPerms || {}) },
    });
    setCrudMode("edit");
    setCrudOpen(true);
  }, [defaultOpsPerms]);

  const saveEmployee = useCallback(async () => {
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim();
    if (!firstName && !email) return;

    const modeSnapshot = crudMode;
    const itemLabelSnapshot = `${firstName} ${lastName}`.trim() || email;
    const now = Date.now();
    const pages = draft.pages || {};
    const opsPerms = draft.opsPerms || {};
    if (selectedEmployee?.employeeId && crudMode === "edit") {
      await update(ref(db, `admin/staffEmployees/${selectedEmployee.employeeId}`), {
        firstName, lastName, email, position: draft.position.trim(), pages, opsPerms, updatedAt: now,
      });
      // Sync permissions to active staff record if linked
      if (selectedEmployee.uid && selectedEmployee.status === "active") {
        await update(ref(db, `admin/staff/${selectedEmployee.uid}/pages`), pages);
        await update(ref(db, `admin/staff/${selectedEmployee.uid}/permissions/ops`), opsPerms);
        await update(ref(db, `users/${selectedEmployee.uid}/adminStaff/pages`), pages);
        await update(ref(db, `users/${selectedEmployee.uid}/adminStaff/permissions/ops`), opsPerms);
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminStaffModal1",
        crudMode: modeSnapshot,
        id: selectedEmployee.employeeId,
        itemLabel: itemLabelSnapshot,
      });
    } else {
      const newRef = push(ref(db, "admin/staffEmployees"));
      await set(newRef, { firstName, lastName, email, position: draft.position.trim(), pages, opsPerms, createdAt: now, updatedAt: now });
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminStaffModal1",
        crudMode: modeSnapshot,
        id: newRef.key || undefined,
        itemLabel: itemLabelSnapshot,
      });
    }
    setCrudOpen(false);
  }, [crudMode, draft, location.pathname, selectedEmployee?.employeeId, selectedEmployee?.uid, selectedEmployee?.status]);

  const deleteEmployee = useCallback(async (row: StaffRow) => {
    if (!row.employeeId) return;
    if (!window.confirm(`Delete employee "${row.firstName} ${row.lastName}"?`)) return;
    await remove(ref(db, `admin/staffEmployees/${row.employeeId}`));
  }, []);

  // Invite creation
  const openInviteModal = useCallback((row: StaffRow) => {
    setInviteTarget(row);
    setInviteLink(null);
    setInviteBusy(false);
    // Use the employee's stored pages if they have any, otherwise default
    const hasPages = Object.values(row.pages || {}).some(Boolean);
    if (hasPages) {
      setInvitePages({ ...row.pages });
    } else {
      const dp: Record<string, boolean> = {};
      PAGE_KEYS.forEach((k) => (dp[k] = false));
      dp.viewer = true;
      setInvitePages(dp);
    }
    setInviteOpsPerms({ ...defaultOpsPerms(), ...(row.opsPerms || {}) });
    setInviteModalOpen(true);
  }, [defaultOpsPerms]);

  const createInvite = async () => {
    if (!inviteTarget) return;
    setInviteBusy(true);
    setInviteLink(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const fnBase = getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      });

      const resp = await fetch(`${fnBase}/createAdminInvite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: inviteTarget.email.trim(),
          pages: invitePages,
          opsPerms: inviteOpsPerms,
          expiresInHours: 168,
          appOrigin: window.location.origin,
        }),
      });
      const data = await resp.json();
      if (data?.success) setInviteLink(data.link);
    } finally {
      setInviteBusy(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const statusLabel = (row: StaffRow) => {
    if (row.status === "active") return "Active";
    if (row.status === "invited") {
      if (row.claimed) return "Claimed";
      if (row.expiresAt && row.expiresAt < Date.now()) return "Expired";
      return "Invited";
    }
    return "Not Invited";
  };

  const statusColor = (row: StaffRow): "success" | "warning" | "error" | "default" | "info" => {
    if (row.status === "active") return "success";
    if (row.status === "invited") {
      if (row.claimed) return "success";
      if (row.expiresAt && row.expiresAt < Date.now()) return "error";
      return "warning";
    }
    return "default";
  };

  const displayName = (row: StaffRow) => {
    const name = `${row.firstName} ${row.lastName}`.trim();
    return name || row.email || "—";
  };

  return (
    <AdminPageShell title="Staff" sx={{ height: "100%" }}>
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <CollapsibleTabHeader
          layout="dataHeaderGap"
          tabs={sectionTabs}
          activeTab={activeSection}
          onTabChange={handleSectionTabChange}
          isExpanded={isTabsExpanded}
          onToggleExpanded={toggleTabsExpanded}
        />

        <Box sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>
          {activeSection === 0 ? (
            <>
              <DataHeader
                showDateControls={false}
                showDateTypeSelector={false}
                searchTerm={search}
                onSearchChange={(t) => {
                  setSearch(t);
                  setPage(0);
                }}
                searchPlaceholder="Search employees…"
                filters={[
                  {
                    label: "Status",
                    options: [
                      { id: "active", name: "Active" },
                      { id: "invited", name: "Invited" },
                      { id: "not_invited", name: "Not Invited" },
                    ],
                    selectedValues: statusFilter,
                    onSelectionChange: (values) => {
                      setStatusFilter(values as string[]);
                      setPage(0);
                    },
                  },
                ]}
                columns={columns}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                onCreateNew={openCreate}
                createButtonLabel="Add Employee"
              />

              <Paper
                sx={{
                  width: "100%",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  mt: 2,
                  boxShadow: "none",
                  borderRadius: 0,
                }}
              >
                <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {columns
                          .filter((c) => columnVisibility[c.key] !== false)
                          .map((c) => (
                            <TableCell key={c.key}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {c.label}
                              </Typography>
                            </TableCell>
                          ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginated.map((row) => (
                        <TableRow
                          key={row.employeeId || row.inviteId || row.uid || row.email}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => openView(row)}
                        >
                          {columnVisibility["name"] !== false ? (
                            <TableCell>
                              <Typography fontWeight={700}>{displayName(row)}</Typography>
                            </TableCell>
                          ) : null}
                          {columnVisibility["email"] !== false ? (
                            <TableCell>
                              <Typography variant="body2">{row.email || "—"}</Typography>
                            </TableCell>
                          ) : null}
                          {columnVisibility["position"] !== false ? (
                            <TableCell>
                              <Typography variant="body2">{row.position || "—"}</Typography>
                            </TableCell>
                          ) : null}
                          {columnVisibility["status"] !== false ? (
                            <TableCell>
                              <Chip size="small" label={statusLabel(row)} color={statusColor(row)} />
                            </TableCell>
                          ) : null}
                          {columnVisibility["permissions"] !== false ? (
                            <TableCell>
                              {row.status !== "not_invited" ? (
                                <Typography variant="body2">
                                  {Object.values(row.pages || {}).filter(Boolean).length}/{PAGE_KEYS.length}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                          ) : null}
                          {columnVisibility["actions"] !== false ? (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Box sx={{ display: "flex", gap: 0.5 }}>
                                {row.status === "not_invited" && row.email ? (
                                  <IconButton size="small" title="Send Invite" onClick={() => openInviteModal(row)}>
                                    <SendIcon fontSize="small" />
                                  </IconButton>
                                ) : null}
                                {row.status === "invited" && row.inviteId ? (
                                  <>
                                    <IconButton
                                      size="small"
                                      title="Copy Invite Link"
                                      onClick={() => void copyToClipboard(`${window.location.origin}/AdminInvite/${row.inviteId}`)}
                                    >
                                      <CopyIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" title="Resend Invite" onClick={() => openInviteModal(row)}>
                                      <SendIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                ) : null}
                                {row.employeeId ? (
                                  <IconButton size="small" title="Edit Employee" onClick={() => openEdit(row)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                ) : null}
                              </Box>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}

                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={columns.filter((c) => columnVisibility[c.key] !== false).length}
                            align="center"
                            sx={{ py: 4 }}
                          >
                            <EmptyStateCard
                              icon={StaffIcon}
                              title="No Employees Found"
                              description="Add an employee, then send them an invite to link their account."
                              cardSx={{ maxWidth: 560, mx: "auto" }}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={filtered.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(event) => {
                      setRowsPerPage(parseInt(event.target.value, 10));
                      setPage(0);
                    }}
                  />
                </Box>
              </Paper>
            </>
          ) : (
            <StaffPositions positions={positionsById} />
          )}
        </Box>
      </AdminSectionCard>

      {/* Add / Edit / View Employee Modal */}
                        <CRUDModal
              open={crudOpen}
              onClose={(reason) => {
                setCrudOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setSelectedEmployee(null)
                  setCrudMode("create")
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "adminStaffModal1",
                crudMode: crudMode,
                id: selectedEmployee?.employeeId,
                itemLabel:
                  selectedEmployee
                    ? displayName(selectedEmployee)
                    : `${draft.firstName} ${draft.lastName}`.trim() || undefined,
              }}
              title={
                crudMode === "create"
                  ? "Add Employee"
                  : crudMode === "edit"
                    ? "Edit Employee"
                    : selectedEmployee
                      ? displayName(selectedEmployee)
                      : "Employee"
              }
              icon={<PersonAddIcon />}
              mode={crudMode}
              onEdit={crudMode === "view" && selectedEmployee?.employeeId ? () => setCrudMode("edit") : undefined}
              onSave={crudMode !== "view" ? saveEmployee : undefined}
              saveButtonText={crudMode === "create" ? "Add" : "Save"}
              topBarActions={crudMode === "view" && selectedEmployee ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {selectedEmployee.status === "not_invited" && selectedEmployee.email ? (
                <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => { setCrudOpen(false); openInviteModal(selectedEmployee); }}>
                  Send Invite
                </Button>
              ) : null}
              {selectedEmployee.status === "invited" && selectedEmployee.inviteId ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={() => void copyToClipboard(`${window.location.origin}/AdminInvite/${selectedEmployee.inviteId}`)}
                >
                  Copy Invite Link
                </Button>
              ) : null}
              {selectedEmployee.employeeId ? (
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { deleteEmployee(selectedEmployee); setCrudOpen(false); }}>
                  Delete
                </Button>
              ) : null}
            </Box>
          ) : undefined}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="First Name"
              fullWidth
              value={draft.firstName}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Last Name"
              fullWidth
              value={draft.lastName}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={draft.email}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              freeSolo
              options={positionNameOptions}
              inputValue={draft.position}
              disabled={crudMode === "view"}
              onInputChange={(_e, v) => setDraft((d) => ({ ...d, position: v }))}
              onChange={(_e, v) => {
                if (typeof v === "string") setDraft((d) => ({ ...d, position: v }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Position"
                  helperText="Pick a saved title from Positions or type a custom one."
                />
              )}
            />
          </Grid>
          {crudMode === "view" && selectedEmployee ? (
            <Grid item xs={12}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box><Chip size="small" label={statusLabel(selectedEmployee)} color={statusColor(selectedEmployee)} /></Box>
                </Box>
                {selectedEmployee.uid ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Linked Account</Typography>
                    <Typography variant="body2">{selectedEmployee.uid}</Typography>
                  </Box>
                ) : null}
                {selectedEmployee.expiresAt && selectedEmployee.status === "invited" ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Invite Expires</Typography>
                    <Typography variant="body2">{new Date(selectedEmployee.expiresAt).toLocaleString()}</Typography>
                  </Box>
                ) : null}
              </Box>
            </Grid>
          ) : null}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
              Admin Page Permissions
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap" }}>
              {PAGE_KEYS.map((k) => (
                <FormControlLabel
                  key={k}
                  control={
                    <Checkbox
                      checked={Boolean(draft.pages?.[k])}
                      disabled={crudMode === "view"}
                      onChange={(e) => setDraft((d) => ({ ...d, pages: { ...d.pages, [k]: e.target.checked } }))}
                    />
                  }
                  label={k}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
              Ops Permissions
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap" }}>
              {["request", "approveTest", "approveProd", "process", "syncProviders", "manageAuthEmails"].map((k) => (
                <FormControlLabel
                  key={k}
                  control={
                    <Checkbox
                      checked={Boolean((draft.opsPerms as any)?.[k])}
                      disabled={crudMode === "view"}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, opsPerms: { ...(d.opsPerms || {}), [k]: e.target.checked } }))
                      }
                    />
                  }
                  label={k}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </CRUDModal>

      {/* Send Invite Modal */}
                        <CRUDModal
              open={inviteModalOpen}
              onClose={(reason) => {
                setInviteModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = () => setInviteModalOpen(false)
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "adminStaffModal2",
                crudMode: "create",
              }}
              title="Send Invite"
              subtitle={inviteTarget ? `${displayName(inviteTarget)} (${inviteTarget.email})` : undefined}
              icon={<SendIcon />}
              mode="create"
              onSave={async (...args) => {
                const __workspaceOnSave = createInvite
                if (typeof __workspaceOnSave !== "function") return undefined
                const result = await __workspaceOnSave(...args)
                removeWorkspaceFormDraft(location.pathname, {
                  crudEntity: "adminStaffModal2",
                  crudMode: "create",
                })
                return result
              }}
              saveButtonText={inviteBusy ? "Sending…" : "Send Invite"}
            >
        <Box sx={{ p: 0 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will generate an invite link. When the employee clicks it and signs in (or creates an account), their account will be linked with admin access.
          </Alert>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Admin Page Permissions
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            {PAGE_KEYS.map((k) => (
              <FormControlLabel
                key={k}
                control={
                  <Checkbox
                    checked={Boolean(invitePages[k])}
                    onChange={(e) => setInvitePages((p) => ({ ...p, [k]: e.target.checked }))}
                  />
                }
                label={k}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            Ops Permissions
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            {["request", "approveTest", "approveProd", "process", "syncProviders", "manageAuthEmails"].map((k) => (
              <FormControlLabel
                key={k}
                control={
                  <Checkbox
                    checked={Boolean((inviteOpsPerms as any)?.[k])}
                    onChange={(e) => setInviteOpsPerms((p) => ({ ...(p || {}), [k]: e.target.checked }))}
                  />
                }
                label={k}
              />
            ))}
          </Box>

          {inviteLink ? (
            <Alert
              severity="success"
              sx={{ mt: 2 }}
              action={
                <IconButton size="small" onClick={() => void copyToClipboard(inviteLink)}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              }
            >
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {inviteLink}
              </Typography>
            </Alert>
          ) : null}
        </Box>
      </CRUDModal>
    </AdminPageShell>
  );
}
