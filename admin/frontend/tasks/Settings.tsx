"use client"
import { useLocation } from "react-router-dom"

import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FormatPaint as TaskColorsIcon,
  Palette as ProjectColorsIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import { db, onValue, push, ref, remove, set, update } from "../../backend/services/Firebase"
import type { CustomFieldDefinition, CustomFieldType, TaskPriority, TaskStatus } from "./types"
import { normalizeHexColor } from "../shared/colorUtils"
import { rootUpdate } from "../shared/rtdb"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"

type Props = {
  fields: CustomFieldDefinition[]
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} id={`org-settings-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

type FieldDraft = {
  label: string
  type: CustomFieldType
  optionsText: string
  required: boolean
  showInTable: boolean
  order: number
}

const FIELDS_PATH = "admin/tasks/fields"

export default function TasksSettings({ fields }: Props) {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(0)
  const [colorsEditMode, setColorsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fields management state
  const [localFields, setLocalFields] = useState<CustomFieldDefinition[]>([])
  const [fieldSearch, setFieldSearch] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [editMode, setEditMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null)
  const [draft, setDraft] = useState<FieldDraft>({
    label: "",
    type: "text",
    optionsText: "",
    required: false,
    showInTable: false,
    order: 0,
  })

  const [taskColors, setTaskColors] = useState<{ status: Partial<Record<TaskStatus, string>>; priority: Partial<Record<TaskPriority, string>> }>({
    status: {},
    priority: {},
  })
  const [taskCustomFieldColors, setTaskCustomFieldColors] = useState<Record<string, Record<string, string>>>({})
  const [taskRowColoring, setTaskRowColoring] = useState<{ mode: "none" | "status" | "priority" | "customField"; fieldId?: string }>({
    mode: "status",
    fieldId: "",
  })

  const [projectColors, setProjectColors] = useState<{ status: Partial<Record<string, string>>; health: Partial<Record<string, string>> }>({
    status: {},
    health: {},
  })
  const [projectCustomFieldColors, setProjectCustomFieldColors] = useState<Record<string, Record<string, string>>>({})
  const [projectRowColoring, setProjectRowColoring] = useState<{ mode: "none" | "status" | "customField"; fieldId?: string }>({
    mode: "status",
    fieldId: "",
  })

  // Fields listener
  useEffect(() => {
    const fieldsRef = ref(db, FIELDS_PATH)
    const unsub = onValue(fieldsRef, (snap) => {
      const val = snap.val() || {}
      const rows: CustomFieldDefinition[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        label: raw?.label || raw?.name || "",
        type: (raw?.type as CustomFieldType) || "text",
        options: Array.isArray(raw?.options) ? raw.options : [],
        required: Boolean(raw?.required),
        showInTable: Boolean(raw?.showInTable),
        order: typeof raw?.order === "number" ? raw.order : 0,
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => {
        const ao = typeof a.order === "number" ? a.order : 9999
        const bo = typeof b.order === "number" ? b.order : 9999
        if (ao !== bo) return ao - bo
        return String(a.label || "").localeCompare(String(b.label || ""))
      })
      setLocalFields(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onValue(ref(db, "admin/ui/colors/tasks"), (snap) => {
      const val = snap.val() || {}
      setTaskColors({
        status: (val?.status || {}) as any,
        priority: (val?.priority || {}) as any,
      })
      setTaskCustomFieldColors(((val?.customFields || {}) as any) || {})
      const rc = (val?.rowColoring || {}) as any
      setTaskRowColoring({
        mode: (rc?.mode as any) || "status",
        fieldId: String(rc?.fieldId || ""),
      })
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onValue(ref(db, "admin/ui/colors/projects"), (snap) => {
      const val = snap.val() || {}
      setProjectColors({
        status: (val?.status || {}) as any,
        health: (val?.health || {}) as any,
      })
      setProjectCustomFieldColors(((val?.customFields || {}) as any) || {})
      const rc = (val?.rowColoring || {}) as any
      setProjectRowColoring({
        mode: (rc?.mode as any) || "status",
        fieldId: String(rc?.fieldId || ""),
      })
    })
    return () => unsub()
  }, [])

  // Local-only color setters (no RTDB write until Save)
  const setTaskColor = (kind: "status" | "priority", key: string, color: string) => {
    const hex = normalizeHexColor(color)
    if (kind === "status") {
      setTaskColors((prev) => ({ ...prev, status: { ...prev.status, [key]: hex || undefined } }))
    } else {
      setTaskColors((prev) => ({ ...prev, priority: { ...prev.priority, [key]: hex || undefined } }))
    }
  }

  const setTaskCustomFieldOptionColor = (fieldId: string, option: string, color: string) => {
    const hex = normalizeHexColor(color)
    setTaskCustomFieldColors((prev) => ({
      ...prev,
      [fieldId]: { ...(prev[fieldId] || {}), [option]: hex || "" },
    }))
  }

  const setTaskRowColoringLocal = (next: { mode: "none" | "status" | "priority" | "customField"; fieldId?: string }) => {
    setTaskRowColoring({ mode: next.mode, fieldId: next.fieldId || "" })
  }

  const setProjectColor = (kind: "status" | "health", key: string, color: string) => {
    const hex = normalizeHexColor(color)
    if (kind === "status") {
      setProjectColors((prev) => ({ ...prev, status: { ...prev.status, [key]: hex || undefined } }))
    } else {
      setProjectColors((prev) => ({ ...prev, health: { ...prev.health, [key]: hex || undefined } }))
    }
  }

  const setProjectCustomFieldOptionColor = (fieldId: string, option: string, color: string) => {
    const hex = normalizeHexColor(color)
    setProjectCustomFieldColors((prev) => ({
      ...prev,
      [fieldId]: { ...(prev[fieldId] || {}), [option]: hex || "" },
    }))
  }

  const setProjectRowColoringLocal = (next: { mode: "none" | "status" | "customField"; fieldId?: string }) => {
    setProjectRowColoring({ mode: next.mode, fieldId: next.fieldId || "" })
  }

  // Persist all color settings to RTDB
  const saveColors = async () => {
    try {
      setSaving(true)
      setError(null)

      const updates: Record<string, any> = {}

      // Task colors
      ;(["todo", "in_progress", "blocked", "done"] as TaskStatus[]).forEach((s) => {
        updates[`admin/ui/colors/tasks/status/${s}`] = (taskColors.status as any)?.[s] || null
      })
      ;(["low", "medium", "high"] as TaskPriority[]).forEach((p) => {
        updates[`admin/ui/colors/tasks/priority/${p}`] = (taskColors.priority as any)?.[p] || null
      })
      updates[`admin/ui/colors/tasks/rowColoring`] = { mode: taskRowColoring.mode, fieldId: taskRowColoring.fieldId || "" }
      // Task custom field colors
      for (const [fid, opts] of Object.entries(taskCustomFieldColors)) {
        for (const [opt, hex] of Object.entries(opts || {})) {
          updates[`admin/ui/colors/tasks/customFields/${fid}/${opt}`] = hex || null
        }
      }

      // Project colors
      ;(["active", "on_hold", "completed"] as string[]).forEach((s) => {
        updates[`admin/ui/colors/projects/status/${s}`] = (projectColors.status as any)?.[s] || null
      })
      ;(["green", "amber", "red"] as string[]).forEach((h) => {
        updates[`admin/ui/colors/projects/health/${h}`] = (projectColors.health as any)?.[h] || null
      })
      updates[`admin/ui/colors/projects/rowColoring`] = { mode: projectRowColoring.mode, fieldId: projectRowColoring.fieldId || "" }
      // Project custom field colors
      for (const [fid, opts] of Object.entries(projectCustomFieldColors)) {
        for (const [opt, hex] of Object.entries(opts || {})) {
          updates[`admin/ui/colors/projects/customFields/${fid}/${opt}`] = hex || null
        }
      }

      await rootUpdate(updates)
      setSuccess("Settings saved successfully")
      setColorsEditMode(false)
    } catch (e: any) {
      setError(e?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const taskStatusBg = (s: TaskStatus) => normalizeHexColor((taskColors.status as any)?.[s] || "")
  const taskPriorityBg = (p: TaskPriority) => normalizeHexColor((taskColors.priority as any)?.[p] || "")
  const taskCustomOptBg = (fieldId: string, opt: string) => normalizeHexColor(taskCustomFieldColors?.[fieldId]?.[opt] || "")

  const projectStatusBg = (s: string) => normalizeHexColor((projectColors.status as any)?.[s] || "")
  const projectHealthBg = (h: string) => normalizeHexColor((projectColors.health as any)?.[h] || "")
  const projectCustomOptBg = (fieldId: string, opt: string) => normalizeHexColor(projectCustomFieldColors?.[fieldId]?.[opt] || "")

  const selectLikeFields = useMemo(() => (fields || []).filter((f) => f.type === "select" || f.type === "multiselect"), [fields])

  // Fields CRUD
  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase()
    if (!q) return localFields
    return localFields.filter((f) => String(f.label || "").toLowerCase().includes(q) || String(f.type || "").toLowerCase().includes(q))
  }, [localFields, fieldSearch])

  const openCreateField = () => {
    setEditing(null)
    setEditMode("create")
    setDraft({ label: "", type: "text", optionsText: "", required: false, showInTable: false, order: localFields.length })
    setEditOpen(true)
  }

  const openEditField = (f: CustomFieldDefinition) => {
    setEditing(f)
    setEditMode("edit")
    setDraft({
      label: f.label || "",
      type: f.type || "text",
      optionsText: (f.options || []).join(", "),
      required: Boolean(f.required),
      showInTable: Boolean(f.showInTable),
      order: typeof f.order === "number" ? f.order : 0,
    })
    setEditOpen(true)
  }

  const saveField = async () => {
    const label = String(draft.label || "").trim()
    if (!label) return
    const now = Date.now()
    const options = String(draft.optionsText || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)

    const payload = {
      label,
      type: draft.type,
      options: draft.type === "select" || draft.type === "multiselect" ? options : [],
      required: Boolean(draft.required),
      showInTable: Boolean(draft.showInTable),
      order: Number(draft.order || 0),
      updatedAt: now,
    }

    if (editing?.id) {
      await update(ref(db, `${FIELDS_PATH}/${editing.id}`), payload)
    } else {
      const newRef = push(ref(db, FIELDS_PATH))
      await set(newRef, { ...payload, createdAt: now })
    }

    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "settingsModal1",
      crudMode: editMode,
      id: editing?.id,
      itemLabel: editing?.label || label,
    })
    setEditOpen(false)
    setEditing(null)
  }

  const deleteField = async (f: CustomFieldDefinition) => {
    if (!f?.id) return
    if (!window.confirm(`Delete field "${f.label}"?`)) return
    await remove(ref(db, `${FIELDS_PATH}/${f.id}`))
  }

  const tabs = useMemo(
    () => [
      { label: "Custom Fields", icon: <SettingsIcon />, id: "general" },
      { label: "Task Colors", icon: <TaskColorsIcon />, id: "task-colors" },
      { label: "Project Colors", icon: <ProjectColorsIcon />, id: "project-colors" },
    ],
    [],
  )

  return (
    <Box sx={{ width: "100%", px: { xs: 1.5, sm: 2, md: 3 }, py: 2 }}>
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            px: { xs: 1.5, sm: 2 },
            py: 1,
            bgcolor: "grey.50",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, v) => {
              setActiveTab(v)
              setColorsEditMode(false)
            }}
            aria-label="Organisation settings tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                minHeight: 44,
                textTransform: "none",
                fontWeight: 600,
              },
            }}
          >
            {tabs.map((t) => (
              <Tab key={t.id} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {activeTab === 0 ? null : colorsEditMode ? (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => void saveColors()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setColorsEditMode(true)}>
                Edit
              </Button>
            )}
          </Box>
        </Box>

        {/* General — Custom Fields */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Custom Fields
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage custom field definitions used across tasks and projects.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Search fields…"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  sx={{ minWidth: 180 }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateField}>
                  Add Field
                </Button>
              </Box>
            </Box>

            <Paper variant="outlined" sx={{ width: "100%", overflow: "hidden" }}>
              <TableContainer>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Label</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="center">Required</TableCell>
                      <TableCell align="center">Show In Table</TableCell>
                      <TableCell>Order</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFields.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{f.label || "—"}</Typography>
                        </TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>{String(f.type || "").replace("_", " ")}</TableCell>
                        <TableCell align="center">{f.required ? "Yes" : "No"}</TableCell>
                        <TableCell align="center">{f.showInTable ? "Yes" : "No"}</TableCell>
                        <TableCell>{typeof f.order === "number" ? f.order : "—"}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" title="Edit" onClick={() => openEditField(f)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" title="Delete" onClick={() => void deleteField(f)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredFields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No fields yet. Click "Add Field" to create one.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </TabPanel>

        {/* Task Colors */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Row coloring (Airtable-style)
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 1, alignItems: "center", mb: 3 }}>
              <Select
                size="small"
                value={taskRowColoring.mode}
                disabled={!colorsEditMode}
                onChange={(e) => setTaskRowColoringLocal({ mode: e.target.value as any, fieldId: taskRowColoring.fieldId })}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="status">By status</MenuItem>
                <MenuItem value="priority">By priority</MenuItem>
                <MenuItem value="customField">By custom field</MenuItem>
              </Select>
              <Select
                size="small"
                value={taskRowColoring.fieldId || ""}
                disabled={!colorsEditMode || taskRowColoring.mode !== "customField"}
                onChange={(e) => setTaskRowColoringLocal({ mode: "customField", fieldId: String(e.target.value || "") })}
                displayEmpty
                renderValue={(v) => {
                  const id = String(v || "")
                  if (!id) return <Typography color="text.secondary">Choose field…</Typography>
                  return selectLikeFields.find((f) => f.id === id)?.label || id
                }}
              >
                <MenuItem value="">
                  <em>Choose field…</em>
                </MenuItem>
                {selectLikeFields.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Status colors
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 1, alignItems: "center", mb: 3 }}>
              {(["todo", "in_progress", "blocked", "done"] as TaskStatus[]).map((s) => (
                <React.Fragment key={s}>
                  <Typography sx={{ textTransform: "capitalize" }}>{s}</Typography>
                  <TextField
                    size="small"
                    type="color"
                    value={taskStatusBg(s) || "#000000"}
                    onChange={(e) => setTaskColor("status", s, e.target.value)}
                    disabled={!colorsEditMode}
                    sx={{ width: 140 }}
                  />
                  <Button size="small" variant="outlined" disabled={!colorsEditMode} onClick={() => setTaskColor("status", s, "")}>
                    Clear
                  </Button>
                </React.Fragment>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Priority colors
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 1, alignItems: "center", mb: 3 }}>
              {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                <React.Fragment key={p}>
                  <Typography sx={{ textTransform: "capitalize" }}>{p}</Typography>
                  <TextField
                    size="small"
                    type="color"
                    value={taskPriorityBg(p) || "#000000"}
                    onChange={(e) => setTaskColor("priority", p, e.target.value)}
                    disabled={!colorsEditMode}
                    sx={{ width: 140 }}
                  />
                  <Button size="small" variant="outlined" disabled={!colorsEditMode} onClick={() => setTaskColor("priority", p, "")}>
                    Clear
                  </Button>
                </React.Fragment>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Custom field option colors (select / multiselect)
            </Typography>
            {selectLikeFields
              .filter((f) => (f.options || []).length > 0)
              .map((f) => (
                <Box key={f.id} sx={{ mb: 2 }}>
                  <Typography fontWeight={700}>{f.label}</Typography>
                  <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 1, alignItems: "center" }}>
                    {(f.options || []).map((opt) => (
                      <React.Fragment key={opt}>
                        <Typography>{opt}</Typography>
                        <TextField
                          size="small"
                          type="color"
                          value={taskCustomOptBg(f.id, opt) || "#000000"}
                          onChange={(e) => setTaskCustomFieldOptionColor(f.id, opt, e.target.value)}
                          disabled={!colorsEditMode}
                          sx={{ width: 140 }}
                        />
                        <Button size="small" variant="outlined" disabled={!colorsEditMode} onClick={() => setTaskCustomFieldOptionColor(f.id, opt, "")}>
                          Clear
                        </Button>
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>
              ))}
          </Box>
        </TabPanel>

        {/* Project Colors */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Row coloring (Airtable-style)
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 1, alignItems: "center", mb: 3 }}>
              <Select
                size="small"
                value={projectRowColoring.mode}
                disabled={!colorsEditMode}
                onChange={(e) => setProjectRowColoringLocal({ mode: e.target.value as any, fieldId: projectRowColoring.fieldId })}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="status">By status</MenuItem>
                <MenuItem value="customField">By custom field</MenuItem>
              </Select>
              <Select
                size="small"
                value={projectRowColoring.fieldId || ""}
                disabled={!colorsEditMode || projectRowColoring.mode !== "customField"}
                onChange={(e) => setProjectRowColoringLocal({ mode: "customField", fieldId: String(e.target.value || "") })}
                displayEmpty
                renderValue={(v) => {
                  const id = String(v || "")
                  if (!id) return <Typography color="text.secondary">Choose field…</Typography>
                  return selectLikeFields.find((f) => f.id === id)?.label || id
                }}
              >
                <MenuItem value="">
                  <em>Choose field…</em>
                </MenuItem>
                {selectLikeFields.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Status colors
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 1, alignItems: "center", mb: 3 }}>
              {(["active", "on_hold", "completed"] as string[]).map((s) => (
                <React.Fragment key={s}>
                  <Typography sx={{ textTransform: "capitalize" }}>{s}</Typography>
                  <TextField
                    size="small"
                    type="color"
                    value={projectStatusBg(s) || "#000000"}
                    onChange={(e) => setProjectColor("status", s, e.target.value)}
                    disabled={!colorsEditMode}
                    sx={{ width: 140 }}
                  />
                  <Button size="small" variant="outlined" disabled={!colorsEditMode} onClick={() => setProjectColor("status", s, "")}>
                    Clear
                  </Button>
                </React.Fragment>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Health colors
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 1, alignItems: "center", mb: 3 }}>
              {(["green", "amber", "red"] as string[]).map((h) => (
                <React.Fragment key={h}>
                  <Typography sx={{ textTransform: "capitalize" }}>{h}</Typography>
                  <TextField
                    size="small"
                    type="color"
                    value={projectHealthBg(h) || "#000000"}
                    onChange={(e) => setProjectColor("health", h, e.target.value)}
                    disabled={!colorsEditMode}
                    sx={{ width: 140 }}
                  />
                  <Button size="small" variant="outlined" disabled={!colorsEditMode} onClick={() => setProjectColor("health", h, "")}>
                    Clear
                  </Button>
                </React.Fragment>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Custom field option colors (select / multiselect)
            </Typography>
            {selectLikeFields
              .filter((f) => (f.options || []).length > 0)
              .map((f) => (
                <Box key={f.id} sx={{ mb: 2 }}>
                  <Typography fontWeight={700}>{f.label}</Typography>
                  <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "1fr 140px 90px", gap: 1, alignItems: "center" }}>
                    {(f.options || []).map((opt) => (
                      <React.Fragment key={opt}>
                        <Typography>{opt}</Typography>
                        <TextField
                          size="small"
                          type="color"
                          value={projectCustomOptBg(f.id, opt) || "#000000"}
                          onChange={(e) => setProjectCustomFieldOptionColor(f.id, opt, e.target.value)}
                          disabled={!colorsEditMode}
                          sx={{ width: 140 }}
                        />
                        <Button size="small" variant="outlined" disabled={!colorsEditMode} onClick={() => setProjectCustomFieldOptionColor(f.id, opt, "")}>
                          Clear
                        </Button>
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>
              ))}
          </Box>
        </TabPanel>
      </Paper>

                        <CRUDModal
              open={editOpen}
              onClose={(reason) => {
                setEditOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setEditing(null)
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "settingsModal1",
                crudMode: editMode,
                id: editing?.id,
                itemLabel: editing?.label || draft.label || undefined,
              }}
              title={editMode === "create" ? "Add Field" : "Edit Field"}
              subtitle={editing?.id ? `Field: ${editing.id}` : undefined}
              icon={<SettingsIcon />}
              mode={editMode}
              onSave={saveField}
            >
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            void saveField()
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Label"
              required
              fullWidth
              value={draft.label}
              onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
            />

            <Select
              fullWidth
              value={draft.type}
              onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as CustomFieldType }))}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="select">Select</MenuItem>
              <MenuItem value="multiselect">Multiselect</MenuItem>
              <MenuItem value="checkbox">Checkbox</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="phone">Phone</MenuItem>
              <MenuItem value="url">URL</MenuItem>
            </Select>

            <TextField
              label="Order"
              type="number"
              fullWidth
              value={draft.order}
              onChange={(e) => setDraft((p) => ({ ...p, order: Number(e.target.value) }))}
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <FormControlLabel
                control={<Switch checked={draft.required} onChange={(e) => setDraft((p) => ({ ...p, required: e.target.checked }))} />}
                label="Required"
              />
              <FormControlLabel
                control={<Switch checked={draft.showInTable} onChange={(e) => setDraft((p) => ({ ...p, showInTable: e.target.checked }))} />}
                label="Show In Table"
              />
            </Box>
          </Box>

          {draft.type === "select" || draft.type === "multiselect" ? (
            <TextField
              sx={{ mt: 2 }}
              label="Options (Comma Separated)"
              fullWidth
              value={draft.optionsText}
              onChange={(e) => setDraft((p) => ({ ...p, optionsText: e.target.value }))}
              placeholder="Option 1, Option 2, Option 3"
            />
          ) : null}
        </Box>
      </CRUDModal>
    </Box>
  )
}
