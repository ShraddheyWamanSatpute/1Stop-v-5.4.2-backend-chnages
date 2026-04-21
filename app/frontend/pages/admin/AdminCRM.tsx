import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { db, onValue, push, ref, set, update, get, remove } from "../../../backend/services/Firebase";
import DataHeader from "../../components/reusable/DataHeader";

type CRMContactStatus = "lead" | "active" | "past" | "blocked";

type CustomFieldType = "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "email" | "phone" | "url";
type CustomFieldDefinition = {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
  showInTable?: boolean;
  order?: number;
  createdAt: number;
  updatedAt: number;
};

type CRMView = {
  id: string;
  name: string;
  config: {
    search?: string;
    statusFilter?: CRMContactStatus[];
    sortValue?: "updatedAt" | "name";
    sortDirection?: "asc" | "desc";
  };
  createdAt: number;
  updatedAt: number;
};

interface CRMContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: CRMContactStatus;
  tags?: string[];
  notes?: string;
  custom?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_STATUS: CRMContactStatus = "lead";

const AdminCRM: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<0 | 1 | 2>(0);

  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CRMContact | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CRMContactStatus[]>([]);
  const [sortValue, setSortValue] = useState<"updatedAt" | "name">("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [fieldDraft, setFieldDraft] = useState<{
    label: string;
    type: CustomFieldType;
    optionsText: string;
    required: boolean;
    showInTable: boolean;
  }>({
    label: "",
    type: "text",
    optionsText: "",
    required: false,
    showInTable: false,
  });

  const [customDraft, setCustomDraft] = useState<Record<string, any>>({});

  const [views, setViews] = useState<CRMView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const [draft, setDraft] = useState<{
    name: string;
    email: string;
    phone: string;
    status: CRMContactStatus;
    tags: string;
    notes: string;
  }>({
    name: "",
    email: "",
    phone: "",
    status: DEFAULT_STATUS,
    tags: "",
    notes: "",
  });

  useEffect(() => {
    setLoading(true);
    const contactsRef = ref(db, `admin/crm/contacts`);
    const unsubscribe = onValue(
      contactsRef,
      (snap) => {
        const val = snap.val() || {};
        const rows: CRMContact[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          name: raw?.name || "",
          email: raw?.email || "",
          phone: raw?.phone || "",
          status: (raw?.status as CRMContactStatus) || DEFAULT_STATUS,
          tags: Array.isArray(raw?.tags) ? raw.tags : [],
          notes: raw?.notes || "",
          custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }));
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        setContacts(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const viewsRef = ref(db, `admin/crm/views`);
    const unsub = onValue(viewsRef, (snap) => {
      const val = snap.val() || {};
      const rows: CRMView[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || "Untitled view",
        config: raw?.config || {},
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }));
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setViews(rows);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setFieldsLoading(true);
    const fieldsRef = ref(db, `admin/crm/fields`);
    const unsub = onValue(
      fieldsRef,
      (snap) => {
        const val = snap.val() || {};
        const rows: CustomFieldDefinition[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          label: raw?.label || raw?.name || "",
          type: (raw?.type as CustomFieldType) || "text",
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
        setFieldsLoading(false);
      },
      () => setFieldsLoading(false),
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (tab !== 1) return;
    setClientsLoading(true);
    const run = async () => {
      try {
        const snap = await get(ref(db, "companies"));
        if (!snap.exists()) {
          setClients([]);
          setClientsLoading(false);
          return;
        }
        const v = snap.val() || {};
        const rows = Object.entries(v).map(([id, raw]: any) => ({
          id,
          name: raw?.companyName || raw?.name || id,
        }));
        rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        setClients(rows);
      } catch {
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    run();
  }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const t = (params.get("tab") || "").toLowerCase();
    if (t === "clients") setTab(1);
    else if (t === "fields") setTab(2);
    else if (t === "contacts") setTab(0);
  }, [location.search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = contacts.filter((c) => {
      if (statusFilter.length > 0 && !statusFilter.includes(c.status)) return false;
      if (!q) return true;
      const tags = (c.tags || []).join(" ").toLowerCase();
      const customText = Object.values(c.custom || {})
        .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .join(" ")
        .toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        tags.includes(q) ||
        customText.includes(q)
      );
    });

    const dir = sortDirection === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      if (sortValue === "name") return a.name.localeCompare(b.name) * dir;
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir;
    });
  }, [contacts, search, statusFilter, sortValue, sortDirection]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", email: "", phone: "", status: DEFAULT_STATUS, tags: "", notes: "" });
    setCustomDraft({});
    setDialogOpen(true);
  };

  const openEdit = (c: CRMContact) => {
    setEditing(c);
    setDraft({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      status: c.status || DEFAULT_STATUS,
      tags: (c.tags || []).join(", "),
      notes: c.notes || "",
    });
    setCustomDraft(c.custom && typeof c.custom === "object" ? c.custom : {});
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return;

    const now = Date.now();
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editing) {
      const contactRef = ref(db, `admin/crm/contacts/${editing.id}`);
      await update(contactRef, {
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        status: draft.status,
        tags,
        notes: draft.notes,
        custom: customDraft || {},
        updatedAt: now,
      });
    } else {
      const contactsRef = ref(db, `admin/crm/contacts`);
      const newRef = push(contactsRef);
      await set(newRef, {
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        status: draft.status,
        tags,
        notes: draft.notes,
        custom: customDraft || {},
        createdAt: now,
        updatedAt: now,
      });
    }

    setDialogOpen(false);
    setEditing(null);
  };

  const applyView = (v: CRMView | null) => {
    if (!v) return;
    const cfg = v.config || {};
    setSearch(String(cfg.search || ""));
    setStatusFilter(Array.isArray(cfg.statusFilter) ? (cfg.statusFilter as CRMContactStatus[]) : []);
    setSortValue((cfg.sortValue as any) || "updatedAt");
    setSortDirection((cfg.sortDirection as any) || "desc");
  };

  const openSaveView = () => {
    const existing = views.find((x) => x.id === activeViewId);
    setViewName(existing?.name || "");
    setViewDialogOpen(true);
  };

  const saveView = async () => {
    const name = viewName.trim();
    if (!name) return;
    const now = Date.now();
    const config = {
      search,
      statusFilter,
      sortValue,
      sortDirection,
    };

    if (activeViewId) {
      await update(ref(db, `admin/crm/views/${activeViewId}`), { name, config, updatedAt: now });
    } else {
      const newRef = push(ref(db, `admin/crm/views`));
      await set(newRef, { name, config, createdAt: now, updatedAt: now });
      setActiveViewId(newRef.key || "");
    }

    setViewDialogOpen(false);
  };

  const deleteActiveView = async () => {
    if (!activeViewId) return;
    await remove(ref(db, `admin/crm/views/${activeViewId}`));
    setActiveViewId("");
  };

  const openCreateField = () => {
    setEditingField(null);
    setFieldDraft({ label: "", type: "text", optionsText: "", required: false, showInTable: false });
    setFieldDialogOpen(true);
  };

  const openEditField = (f: CustomFieldDefinition) => {
    setEditingField(f);
    setFieldDraft({
      label: f.label || "",
      type: f.type || "text",
      optionsText: (f.options || []).join(", "),
      required: Boolean(f.required),
      showInTable: Boolean(f.showInTable),
    });
    setFieldDialogOpen(true);
  };

  const saveField = async () => {
    const label = fieldDraft.label.trim();
    if (!label) return;
    const now = Date.now();
    const options = fieldDraft.optionsText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      label,
      type: fieldDraft.type,
      options: ["select", "multiselect"].includes(fieldDraft.type) ? options : [],
      required: Boolean(fieldDraft.required),
      showInTable: Boolean(fieldDraft.showInTable),
      updatedAt: now,
    };

    if (editingField) {
      await update(ref(db, `admin/crm/fields/${editingField.id}`), payload);
    } else {
      const newRef = push(ref(db, `admin/crm/fields`));
      await set(newRef, { ...payload, createdAt: now });
    }

    setFieldDialogOpen(false);
    setEditingField(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={tab === 2 ? "" : search}
        onSearchChange={tab === 2 ? undefined : (t) => setSearch(t)}
        searchPlaceholder={tab === 1 ? "Search clients…" : tab === 2 ? "Search…" : "Search name, email, phone, tags, status, custom fields…"}
        filtersExpanded={tab === 0 ? filtersExpanded : undefined}
        onFiltersToggle={tab === 0 ? () => setFiltersExpanded((p) => !p) : undefined}
        filters={
          tab === 0
            ? [
                {
                  label: "Status",
                  options: [
                    { id: "lead", name: "lead" },
                    { id: "active", name: "active" },
                    { id: "past", name: "past" },
                    { id: "blocked", name: "blocked" },
                  ],
                  selectedValues: statusFilter,
                  onSelectionChange: (values) => setStatusFilter(values as CRMContactStatus[]),
                },
              ]
            : []
        }
        sortOptions={
          tab === 0
            ? [
                { value: "updatedAt", label: "Last updated" },
                { value: "name", label: "Name" },
              ]
            : []
        }
        sortValue={tab === 0 ? sortValue : ""}
        sortDirection={tab === 0 ? sortDirection : "asc"}
        onSortChange={
          tab === 0
            ? (value, direction) => {
                setSortValue(value as "updatedAt" | "name");
                setSortDirection(direction);
              }
            : undefined
        }
        onCreateNew={tab === 0 ? openCreate : tab === 2 ? openCreateField : undefined}
        createButtonLabel={tab === 2 ? "Add Field" : "Add Contact"}
        createDisabled={tab === 1}
        createDisabledTooltip={tab === 1 ? "Clients are read-only." : undefined}
        additionalControls={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexWrap: "wrap" }}>
            {tab === 0 ? (
              <Select
                size="small"
                value={activeViewId}
                onChange={(e) => {
                  const id = String(e.target.value || "")
                  setActiveViewId(id)
                  const v = views.find((x) => x.id === id) || null
                  if (v) applyView(v)
                }}
                displayEmpty
                sx={{
                  minWidth: 180,
                  color: "primary.contrastText",
                  borderColor: "rgba(255,255,255,0.6)",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.6)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.9)" },
                  "& .MuiSvgIcon-root": { color: "primary.contrastText" },
                }}
                renderValue={(v) => {
                  const id = String(v || "")
                  if (!id) return <Typography color="primary.contrastText">All</Typography>
                  return <Typography color="primary.contrastText">{views.find((x) => x.id === id)?.name || "View"}</Typography>
                }}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {views.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </Select>
            ) : null}

            {tab === 0 ? (
              <Button
                size="small"
                variant="outlined"
                onClick={openSaveView}
                sx={{ color: "primary.contrastText", borderColor: "rgba(255,255,255,0.6)" }}
              >
                Save view
              </Button>
            ) : null}
            {tab === 0 ? (
              <Button
                size="small"
                variant="outlined"
                disabled={!activeViewId}
                onClick={deleteActiveView}
                sx={{ color: "primary.contrastText", borderColor: "rgba(255,255,255,0.6)" }}
              >
                Delete view
              </Button>
            ) : null}

            <Tabs
              value={tab}
              onChange={(_e, v) => {
                setTab(v)
                const params = new URLSearchParams(location.search || "")
                if (v === 0) params.set("tab", "contacts")
                if (v === 1) params.set("tab", "clients")
                if (v === 2) params.set("tab", "fields")
                navigate({ pathname: "/Admin/CRM", search: `?${params.toString()}` }, { replace: true })
              }}
              sx={{
                ml: 1,
                "& .MuiTab-root": { color: "primary.contrastText", textTransform: "none", minHeight: 40 },
                "& .MuiTabs-indicator": { bgcolor: "primary.contrastText" },
              }}
            >
              <Tab label="Contacts" />
              <Tab label="Clients" />
              <Tab label="Fields" />
            </Tabs>
          </Box>
        }
      />

      {tab === 1 ? (
        <Card>
          <CardContent>
            <Typography variant="h6">Clients</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All companies in the system (read from `companies/*`).
            </Typography>
            {clientsLoading ? (
              <Alert severity="info">Loading clients…</Alert>
            ) : clients.length === 0 ? (
              <Alert severity="info">No clients found.</Alert>
            ) : (
              <Box sx={{ display: "grid", gap: 1 }}>
                {clients.slice(0, 200).map((c) => (
                  <Box key={c.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Typography fontWeight={600}>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.id}
                    </Typography>
                  </Box>
                ))}
                {clients.length > 200 ? (
                  <Typography variant="caption" color="text.secondary">
                    Showing first 200 of {clients.length}
                  </Typography>
                ) : null}
              </Box>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 2 ? (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="h6">CRM fields</Typography>
                <Typography variant="body2" color="text.secondary">
                  Add custom properties like HubSpot/Airtable. These appear on the Contact form and can be shown as columns.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateField}>
                Add Field
              </Button>
            </Box>

            {fieldsLoading ? (
              <Alert severity="info">Loading fields…</Alert>
            ) : fields.length === 0 ? (
              <Alert severity="info">No custom fields yet. Click “Add Field”.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Label</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Required</TableCell>
                      <TableCell>Show in table</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((f) => (
                      <TableRow key={f.id} hover sx={{ cursor: "pointer" }} onClick={() => openEditField(f)}>
                        <TableCell>
                          <Typography fontWeight={700}>{f.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {f.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{f.type}</TableCell>
                        <TableCell>{f.required ? "Yes" : "No"}</TableCell>
                        <TableCell>{f.showInTable ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab !== 0 ? null : (
      <Card>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tags</TableCell>
                  {fields.filter((f) => f.showInTable).map((f) => (
                    <TableCell key={f.id}>{f.label}</TableCell>
                  ))}
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6 + fields.filter((f) => f.showInTable).length} align="center">
                      <Typography color="text.secondary">No contacts yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => openEdit(c)}
                    >
                      <TableCell>
                        <Typography fontWeight={600}>{c.name}</Typography>
                      </TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.status}
                          color={
                            c.status === "active"
                              ? "success"
                              : c.status === "lead"
                              ? "primary"
                              : c.status === "blocked"
                              ? "error"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {(c.tags || []).slice(0, 3).map((t) => (
                          <Chip key={t} size="small" label={t} sx={{ mr: 0.5 }} />
                        ))}
                        {(c.tags || []).length > 3 && (
                          <Chip size="small" label={`+${(c.tags || []).length - 3}`} />
                        )}
                      </TableCell>
                      {fields.filter((f) => f.showInTable).map((f) => {
                        const v = (c.custom || {})[f.id]
                        const display =
                          Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : (v ?? "")
                        return <TableCell key={f.id}>{display || "—"}</TableCell>
                      })}
                      <TableCell>{new Date(c.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filtered.length} of {contacts.length}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? "Edit Contact" : "Add Contact"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Name"
                required
                fullWidth
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                fullWidth
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, status: e.target.value as CRMContactStatus }))
                }
              >
                <MenuItem value="lead">lead</MenuItem>
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="past">past</MenuItem>
                <MenuItem value="blocked">blocked</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Tags (comma separated)"
                fullWidth
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                minRows={5}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </Grid>

            {fields.length > 0 ? (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Custom fields
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  These are configured in the Fields tab.
                </Typography>
              </Grid>
            ) : null}

            {fields.map((f) => {
              const value = (customDraft || {})[f.id]
              const common = {
                key: f.id,
              }

              if (f.type === "checkbox") {
                return (
                  <Grid item xs={12} md={6} {...common}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={Boolean(value)}
                          onChange={(e) => setCustomDraft((p) => ({ ...p, [f.id]: e.target.checked }))}
                        />
                      }
                      label={f.label}
                    />
                  </Grid>
                )
              }

              if (f.type === "select" || f.type === "multiselect") {
                const options = f.options || []
                const selected = f.type === "multiselect" ? (Array.isArray(value) ? value : []) : String(value || "")
                return (
                  <Grid item xs={12} md={6} {...common}>
                    <Select
                      fullWidth
                      multiple={f.type === "multiselect"}
                      value={selected as any}
                      onChange={(e) => {
                        const v = e.target.value
                        setCustomDraft((p) => ({ ...p, [f.id]: v }))
                      }}
                      displayEmpty
                      renderValue={(v) => {
                        if (f.type === "multiselect") {
                          const arr = Array.isArray(v) ? v : []
                          return arr.length ? arr.join(", ") : `Select ${f.label}`
                        }
                        return v ? String(v) : `Select ${f.label}`
                      }}
                    >
                      {options.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                )
              }

              return (
                <Grid item xs={12} md={6} {...common}>
                  <TextField
                    label={f.label}
                    fullWidth
                    required={Boolean(f.required)}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={value ?? ""}
                    onChange={(e) => setCustomDraft((p) => ({ ...p, [f.id]: e.target.value }))}
                    InputLabelProps={f.type === "date" ? { shrink: true } : undefined}
                  />
                </Grid>
              )
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!draft.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Label"
                required
                fullWidth
                value={fieldDraft.label}
                onChange={(e) => setFieldDraft((p) => ({ ...p, label: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Select
                fullWidth
                value={fieldDraft.type}
                onChange={(e) => setFieldDraft((p) => ({ ...p, type: e.target.value as CustomFieldType }))}
              >
                <MenuItem value="text">text</MenuItem>
                <MenuItem value="number">number</MenuItem>
                <MenuItem value="date">date</MenuItem>
                <MenuItem value="select">select</MenuItem>
                <MenuItem value="multiselect">multiselect</MenuItem>
                <MenuItem value="checkbox">checkbox</MenuItem>
                <MenuItem value="email">email</MenuItem>
                <MenuItem value="phone">phone</MenuItem>
                <MenuItem value="url">url</MenuItem>
              </Select>
            </Grid>
            {fieldDraft.type === "select" || fieldDraft.type === "multiselect" ? (
              <Grid item xs={12}>
                <TextField
                  label="Options (comma separated)"
                  fullWidth
                  value={fieldDraft.optionsText}
                  onChange={(e) => setFieldDraft((p) => ({ ...p, optionsText: e.target.value }))}
                />
              </Grid>
            ) : null}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={fieldDraft.required}
                    onChange={(e) => setFieldDraft((p) => ({ ...p, required: e.target.checked }))}
                  />
                }
                label="Required"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={fieldDraft.showInTable}
                    onChange={(e) => setFieldDraft((p) => ({ ...p, showInTable: e.target.checked }))}
                  />
                }
                label="Show in table"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveField} disabled={!fieldDraft.label.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{activeViewId ? "Save view" : "Create view"}</DialogTitle>
        <DialogContent>
          <TextField
            label="View name"
            fullWidth
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            This saves your current search, status filter, and sort settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveView} disabled={!viewName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCRM;

