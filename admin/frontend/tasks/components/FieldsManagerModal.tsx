import React, { useEffect, useMemo, useState } from "react"
import { Box, FormControlLabel, IconButton, MenuItem, Paper, Select, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material"
import { Delete as DeleteIcon, Edit as EditIcon, Settings as SettingsIcon } from "@mui/icons-material"
import DataHeader from "../../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../../app/frontend/components/reusable/EmptyStateCard"
import { db, onValue, push, ref, remove, set, update } from "../../../backend/services/Firebase"
import type { CustomFieldDefinition, CustomFieldType } from "../types"
import { useLocation } from "react-router-dom"

type FieldDraft = {
  label: string
  type: CustomFieldType
  optionsText: string
  required: boolean
  showInTable: boolean
  order: number
}

type Props = {
  open: boolean
  onClose: () => void
}

const FIELDS_PATH = "admin/tasks/fields"

export default function FieldsManagerModal({ open, onClose }: Props) {
  const location = useLocation()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [search, setSearch] = useState("")
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

  useEffect(() => {
    if (!open) return
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
      setFields(rows)
    })
    return () => unsub()
  }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return fields
    return fields.filter((f) => String(f.label || "").toLowerCase().includes(q) || String(f.type || "").toLowerCase().includes(q))
  }, [fields, search])

  const openCreate = () => {
    setEditing(null)
    setEditMode("create")
    setDraft({ label: "", type: "text", optionsText: "", required: false, showInTable: false, order: fields.length })
    setEditOpen(true)
  }

  const openEdit = (f: CustomFieldDefinition) => {
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
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "fieldsManagerModalModal2",
        crudMode: editMode,
        id: editing.id,
        itemLabel: label,
      })
    } else {
      const newRef = push(ref(db, FIELDS_PATH))
      await set(newRef, { ...payload, createdAt: now })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "fieldsManagerModalModal2",
        crudMode: editMode,
        id: newRef.key || undefined,
        itemLabel: label,
      })
    }

    setEditOpen(false)
    setEditing(null)
  }

  const deleteField = async (f: CustomFieldDefinition) => {
    if (!f?.id) return
    if (!window.confirm(`Delete field "${f.label}"?`)) return
    await remove(ref(db, `${FIELDS_PATH}/${f.id}`))
  }

  return (
    <>
                        <CRUDModal
              open={open}
              onClose={(reason) => {
                onClose()
                if (isCrudModalHardDismiss(reason)) {
                  setEditOpen(false)
                  setEditing(null)
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "fieldsManagerModalModal1",
                crudMode: "view",
              }}
              title="Fields"
              subtitle="Used by Tasks & Projects"
              icon={<SettingsIcon />}
              mode="view"
            >
        <Box sx={{ p: 0 }}>
          <DataHeader
            showDateControls={false}
            showDateTypeSelector={false}
            searchTerm={search}
            onSearchChange={(t) => setSearch(t)}
            searchPlaceholder="Search fields…"
            onCreateNew={openCreate}
            createButtonLabel="Add Field"
          />

          <Paper sx={{ width: "100%", overflow: "hidden" }}>
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
                  {filtered.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>
                        <Typography fontWeight={800}>{f.label || "—"}</Typography>
                      </TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>{String(f.type || "").replace("_", " ")}</TableCell>
                      <TableCell align="center">{f.required ? "Yes" : "No"}</TableCell>
                      <TableCell align="center">{f.showInTable ? "Yes" : "No"}</TableCell>
                      <TableCell>{typeof f.order === "number" ? f.order : "—"}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" title="Edit" onClick={() => openEdit(f)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Delete" onClick={() => void deleteField(f)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <EmptyStateCard
                          icon={SettingsIcon}
                          title="No fields yet"
                          description="Add custom fields that can be used by both Tasks and Projects."
                          cardSx={{ maxWidth: 560, mx: "auto" }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </CRUDModal>

                        <CRUDModal
              open={editOpen}
              onClose={(reason) => {
                setEditOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setEditing(null)
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "fieldsManagerModalModal2",
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
    </>
  )
}

