import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { db, onValue, push, ref, set, update, remove } from "../../../backend/services/Firebase";
import AdminProjects from "./AdminProjects";
import DataHeader from "../../components/reusable/DataHeader";

type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
type TaskPriority = "low" | "medium" | "high";

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

type TaskView = {
  id: string;
  name: string;
  config: {
    taskSearch?: string;
    statusFilter?: TaskStatus[];
    priorityFilter?: TaskPriority[];
    projectFilter?: string[];
    sortValue?: "updatedAt" | "dueDate" | "title";
    sortDirection?: "asc" | "desc";
  };
  createdAt: number;
  updatedAt: number;
};

interface AdminTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // yyyy-mm-dd
  projectId?: string;
  description?: string;
  tags?: string[];
  assignee?: string;
  custom?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface AdminProjectLite {
  id: string;
  name: string;
}

const AdminTasks: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [projects, setProjects] = useState<AdminProjectLite[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState<"updatedAt" | "dueDate" | "title">("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [projectSortValue, setProjectSortValue] = useState<"updatedAt" | "name">("updatedAt");
  const [projectSortDirection, setProjectSortDirection] = useState<"asc" | "desc">("desc");

  const projectsCreateRef = useRef<(() => void) | null>(null);

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

  const [views, setViews] = useState<TaskView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const [draft, setDraft] = useState<{
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
    projectId: string;
    description: string;
    tags: string;
    assignee: string;
  }>({
    title: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    projectId: "",
    description: "",
    tags: "",
    assignee: "",
  });

  useEffect(() => {
    setLoading(true);

    const tasksRef = ref(db, `admin/tasks`);
    const unsubTasks = onValue(
      tasksRef,
      (snap) => {
        const val = snap.val() || {};
        const rows: AdminTask[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          title: raw?.title || "",
          status: (raw?.status as TaskStatus) || "todo",
          priority: (raw?.priority as TaskPriority) || "medium",
          dueDate: raw?.dueDate || "",
          projectId: raw?.projectId || "",
          description: raw?.description || "",
          tags: Array.isArray(raw?.tags) ? raw.tags : [],
          assignee: raw?.assignee || "",
          custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }));
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        setTasks(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );

    const projectsRef = ref(db, `admin/projects`);
    const unsubProjects = onValue(projectsRef, (snap) => {
      const val = snap.val() || {};
      const rows: AdminProjectLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || "Untitled",
      }));
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setProjects(rows);
    });

    return () => {
      unsubTasks();
      unsubProjects();
    };
  }, []);

  useEffect(() => {
    const viewsRef = ref(db, `admin/tasks/views`);
    const unsub = onValue(viewsRef, (snap) => {
      const val = snap.val() || {};
      const rows: TaskView[] = Object.entries(val).map(([id, raw]: any) => ({
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
    const fieldsRef = ref(db, `admin/tasks/fields`);
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

  // If navigated from a project, pre-select project filter
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const projectId = params.get("projectId") || "";
    if (projectId) {
      setDraft((d) => ({ ...d, projectId }));
    }
  }, [location.search]);

  // Deep-link: /Admin/Tasks?tab=tasks&taskId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const taskId = String(params.get("taskId") || "").trim();
    if (!taskId) return;
    if (dialogOpen) return;
    const found = tasks.find((t) => t.id === taskId);
    if (found) openEdit(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, tasks, dialogOpen]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const t = (params.get("tab") || "").toLowerCase();
    if (t === "projects") setTab(1);
    if (t === "tasks") setTab(0);
    if (t === "fields") setTab(2);
  }, [location.search]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    const base = tasks.filter((t) => {
      if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false;
      if (projectFilter.length > 0 && !projectFilter.includes(t.projectId || "")) return false;

      if (!q) return true;
      const projectName = projectNameById.get(t.projectId || "") || "";
      const tagsText = (t.tags || []).join(" ").toLowerCase();
      const assigneeText = String(t.assignee || "").toLowerCase();
      const customText = Object.values(t.custom || {})
        .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .join(" ")
        .toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        projectName.toLowerCase().includes(q) ||
        tagsText.includes(q) ||
        assigneeText.includes(q) ||
        customText.includes(q)
      );
    });

    const dir = sortDirection === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      if (sortValue === "title") return a.title.localeCompare(b.title) * dir;
      if (sortValue === "dueDate") return String(a.dueDate || "").localeCompare(String(b.dueDate || "")) * dir;
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir;
    });
  }, [tasks, taskSearch, projectNameById, statusFilter, priorityFilter, projectFilter, sortValue, sortDirection]);

  const openCreate = () => {
    setEditing(null);
    setDraft({
      title: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      projectId: "",
      description: "",
      tags: "",
      assignee: "",
    });
    setCustomDraft({});
    setDialogOpen(true);
  };

  const openEdit = (t: AdminTask) => {
    setEditing(t);
    setDraft({
      title: t.title || "",
      status: t.status || "todo",
      priority: t.priority || "medium",
      dueDate: t.dueDate || "",
      projectId: t.projectId || "",
      description: t.description || "",
      tags: (t.tags || []).join(", "),
      assignee: t.assignee || "",
    });
    setCustomDraft(t.custom && typeof t.custom === "object" ? t.custom : {});
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim()) return;
    const now = Date.now();
    const tags = draft.tags
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      title: draft.title.trim(),
      status: draft.status,
      priority: draft.priority,
      dueDate: draft.dueDate || "",
      projectId: draft.projectId || "",
      description: draft.description,
      tags,
      assignee: draft.assignee.trim(),
      custom: customDraft || {},
      updatedAt: now,
    };

    if (editing) {
      const taskRef = ref(db, `admin/tasks/${editing.id}`);
      await update(taskRef, payload);
    } else {
      const tasksRef = ref(db, `admin/tasks`);
      const newRef = push(tasksRef);
      await set(newRef, { ...payload, createdAt: now });
    }

    setDialogOpen(false);
    setEditing(null);
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
      await update(ref(db, `admin/tasks/fields/${editingField.id}`), payload);
    } else {
      const newRef = push(ref(db, `admin/tasks/fields`));
      await set(newRef, { ...payload, createdAt: now });
    }

    setFieldDialogOpen(false);
    setEditingField(null);
  };

  const applyView = (v: TaskView | null) => {
    if (!v) return;
    const cfg = v.config || {};
    setTaskSearch(String(cfg.taskSearch || ""));
    setStatusFilter(Array.isArray(cfg.statusFilter) ? (cfg.statusFilter as TaskStatus[]) : []);
    setPriorityFilter(Array.isArray(cfg.priorityFilter) ? (cfg.priorityFilter as TaskPriority[]) : []);
    setProjectFilter(Array.isArray(cfg.projectFilter) ? (cfg.projectFilter as string[]) : []);
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
      taskSearch,
      statusFilter,
      priorityFilter,
      projectFilter,
      sortValue,
      sortDirection,
    };

    if (activeViewId) {
      await update(ref(db, `admin/tasks/views/${activeViewId}`), { name, config, updatedAt: now });
    } else {
      const newRef = push(ref(db, `admin/tasks/views`));
      await set(newRef, { name, config, createdAt: now, updatedAt: now });
      setActiveViewId(newRef.key || "");
    }

    setViewDialogOpen(false);
  };

  const deleteActiveView = async () => {
    if (!activeViewId) return;
    await remove(ref(db, `admin/tasks/views/${activeViewId}`));
    setActiveViewId("");
  };

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={tab === 2 ? "" : tab === 1 ? projectSearch : taskSearch}
        onSearchChange={tab === 2 ? undefined : (t) => (tab === 1 ? setProjectSearch(t) : setTaskSearch(t))}
        searchPlaceholder={tab === 2 ? "Search…" : tab === 1 ? "Search projects…" : "Search title, description, status, priority, project, tags…"}
        filtersExpanded={tab === 0 ? filtersExpanded : undefined}
        onFiltersToggle={tab === 0 ? () => setFiltersExpanded((p) => !p) : undefined}
        filters={
          tab === 1 || tab === 2
            ? []
            : [
                {
                  label: "Status",
                  options: [
                    { id: "todo", name: "todo" },
                    { id: "in_progress", name: "in_progress" },
                    { id: "blocked", name: "blocked" },
                    { id: "done", name: "done" },
                  ],
                  selectedValues: statusFilter,
                  onSelectionChange: (values) => setStatusFilter(values as TaskStatus[]),
                },
                {
                  label: "Priority",
                  options: [
                    { id: "low", name: "low" },
                    { id: "medium", name: "medium" },
                    { id: "high", name: "high" },
                  ],
                  selectedValues: priorityFilter,
                  onSelectionChange: (values) => setPriorityFilter(values as TaskPriority[]),
                },
                {
                  label: "Project",
                  options: projects.map((p) => ({ id: p.id, name: p.name })),
                  selectedValues: projectFilter,
                  onSelectionChange: (values) => setProjectFilter(values),
                },
              ]
        }
        sortOptions={
          tab === 2
            ? []
            : tab === 1
            ? [
                { value: "updatedAt", label: "Last updated" },
                { value: "name", label: "Name" },
              ]
            : [
                { value: "updatedAt", label: "Last updated" },
                { value: "dueDate", label: "Due date" },
                { value: "title", label: "Title" },
              ]
        }
        sortValue={tab === 2 ? "" : tab === 1 ? projectSortValue : sortValue}
        sortDirection={tab === 2 ? "asc" : tab === 1 ? projectSortDirection : sortDirection}
        onSortChange={
          tab === 2
            ? undefined
            : (value, direction) => {
                if (tab === 1) {
                  setProjectSortValue(value as any);
                  setProjectSortDirection(direction);
                } else {
                  setSortValue(value as any);
                  setSortDirection(direction);
                }
              }
        }
        onCreateNew={
          tab === 2 ? openCreateField : tab === 1 ? () => projectsCreateRef.current?.() : openCreate
        }
        createButtonLabel={tab === 2 ? "Add Field" : tab === 1 ? "Add Project" : "Add Task"}
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
                if (v === 0) params.set("tab", "tasks")
                if (v === 1) params.set("tab", "projects")
                if (v === 2) params.set("tab", "fields")
                navigate({ pathname: "/Admin/Tasks", search: `?${params.toString()}` }, { replace: true })
              }}
              sx={{
                ml: 1,
                "& .MuiTab-root": { color: "primary.contrastText", textTransform: "none", minHeight: 40 },
                "& .MuiTabs-indicator": { bgcolor: "primary.contrastText" },
              }}
            >
              <Tab label="Tasks" />
              <Tab label="Projects" />
              <Tab label="Fields" />
            </Tabs>
          </Box>
        }
      />

      {tab === 1 ? (
        <AdminProjects
          embed
          hideHeader
          searchTerm={projectSearch}
          onSearchChange={setProjectSearch}
          sortValue={projectSortValue}
          sortDirection={projectSortDirection}
          onSortChange={(value, direction) => {
            setProjectSortValue(value);
            setProjectSortDirection(direction);
          }}
          createHandlerRef={projectsCreateRef}
        />
      ) : null}

      {tab === 2 ? (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="h6">Task fields</Typography>
                <Typography variant="body2" color="text.secondary">
                  Add Airtable/Notion style properties for tasks. They appear on the Task form and can be shown as columns.
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
                  <TableCell>Title</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due</TableCell>
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
                      <Typography color="text.secondary">No tasks yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => {
                    const projName = t.projectId ? projectNameById.get(t.projectId) : "";
                    return (
                      <TableRow key={t.id} hover sx={{ cursor: "pointer" }} onClick={() => openEdit(t)}>
                        <TableCell>
                          <Typography fontWeight={600}>{t.title}</Typography>
                        </TableCell>
                        <TableCell
                          onClick={(e) => {
                            if (!t.projectId) return;
                            e.stopPropagation();
                            navigate(`/Admin/Tasks?projectId=${encodeURIComponent(t.projectId)}`);
                          }}
                          sx={{ cursor: t.projectId ? "pointer" : "default" }}
                        >
                          {projName || "—"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t.status}
                            color={
                              t.status === "done"
                                ? "success"
                                : t.status === "in_progress"
                                ? "primary"
                                : t.status === "blocked"
                                ? "error"
                                : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t.priority}
                            color={t.priority === "high" ? "error" : t.priority === "medium" ? "warning" : "default"}
                          />
                        </TableCell>
                        <TableCell>{t.dueDate || "—"}</TableCell>
                        {fields.filter((f) => f.showInTable).map((f) => {
                          const v = (t.custom || {})[f.id]
                          const display =
                            Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : (v ?? "")
                          return <TableCell key={f.id}>{display || "—"}</TableCell>
                        })}
                        <TableCell>{new Date(t.updatedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filtered.length} of {tasks.length}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? "Edit Task" : "Add Task"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={8}>
              <TextField
                label="Title"
                required
                fullWidth
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Select
                fullWidth
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TaskStatus }))}
              >
                <MenuItem value="todo">todo</MenuItem>
                <MenuItem value="in_progress">in_progress</MenuItem>
                <MenuItem value="blocked">blocked</MenuItem>
                <MenuItem value="done">done</MenuItem>
              </Select>
            </Grid>

            <Grid item xs={12} md={4}>
              <Select
                fullWidth
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TaskPriority }))}
              >
                <MenuItem value="low">low</MenuItem>
                <MenuItem value="medium">medium</MenuItem>
                <MenuItem value="high">high</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} md={4}>
              <Select
                fullWidth
                value={draft.projectId}
                onChange={(e) => setDraft((d) => ({ ...d, projectId: e.target.value as string }))}
                displayEmpty
                renderValue={(v) => {
                  if (!v) return <Typography color="text.secondary">No project</Typography>;
                  return projectNameById.get(v) || "Unknown project";
                }}
              >
                <MenuItem value="">
                  <em>No project</em>
                </MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Due date"
                type="date"
                fullWidth
                value={draft.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={4}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Tags (comma separated)"
                fullWidth
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Assignee (name/email)"
                fullWidth
                value={draft.assignee}
                onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
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
              const common = { key: f.id }

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
          <Button variant="contained" onClick={save} disabled={!draft.title.trim()}>
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
            This saves your current search, filters, and sort settings.
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

export default AdminTasks;

