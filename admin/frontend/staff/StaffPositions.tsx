import React, { useCallback, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { Edit as EditIcon, Delete as DeleteIcon, WorkOutline as PositionIcon } from "@mui/icons-material"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import { db, push, ref, remove, set, update } from "../../backend/services/Firebase"

export type StaffPositionRow = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

type Props = {
  positions: Record<string, { name?: string; createdAt?: number; updatedAt?: number }>
}

const COLS = [
  { key: "name", label: "Position title" },
  { key: "actions", label: "Actions" },
]

export default function StaffPositions({ positions }: Props) {
  const location = useLocation()
  const [search, setSearch] = useState("")
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({ name: true, actions: true })
  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit">("create")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState("")

  const rows = useMemo<StaffPositionRow[]>(() => {
    return Object.entries(positions || {})
      .map(([id, raw]) => ({
        id,
        name: String(raw?.name || "").trim(),
        createdAt: Number(raw?.createdAt || 0),
        updatedAt: Number(raw?.updatedAt || 0),
      }))
      .filter((r) => r.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [positions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [rows, search])

  const openCreate = useCallback(() => {
    setCrudMode("create")
    setSelectedId(null)
    setNameDraft("")
    setCrudOpen(true)
  }, [])

  const openEdit = useCallback((row: StaffPositionRow) => {
    setCrudMode("edit")
    setSelectedId(row.id)
    setNameDraft(row.name)
    setCrudOpen(true)
  }, [])

  const save = useCallback(async () => {
    const n = nameDraft.trim()
    if (!n) return
    const now = Date.now()
    if (crudMode === "edit" && selectedId) {
      await update(ref(db, `admin/staffPositions/${selectedId}`), { name: n, updatedAt: now })
    } else {
      const newRef = push(ref(db, "admin/staffPositions"))
      await set(newRef, { name: n, createdAt: now, updatedAt: now })
    }
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "staffPositionsModal1",
      crudMode: crudMode,
      id: selectedId || undefined,
      itemLabel: n,
    })
    setCrudOpen(false)
  }, [crudMode, nameDraft, selectedId, location.pathname])

  const del = useCallback(async (row: StaffPositionRow) => {
    if (!window.confirm(`Remove position "${row.name}"? Existing employees keep their current position text.`)) return
    await remove(ref(db, `admin/staffPositions/${row.id}`))
  }, [])

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search positions…"
        filters={[]}
        columns={COLS}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onCreateNew={openCreate}
        createButtonLabel="Add position"
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
                {COLS.filter((c) => columnVisibility[c.key] !== false).map((c) => (
                  <TableCell key={c.key}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {c.label}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} hover>
                  {columnVisibility.name !== false ? (
                    <TableCell>
                      <Typography fontWeight={700}>{row.name}</Typography>
                    </TableCell>
                  ) : null}
                  {columnVisibility.actions !== false ? (
                    <TableCell width={120}>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton size="small" title="Edit" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Delete" onClick={() => void del(row)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS.filter((c) => columnVisibility[c.key] !== false).length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={PositionIcon}
                      title="No positions yet"
                      description="Add titles here so they appear as quick picks on employee records (you can still type a custom position)."
                      cardSx={{ maxWidth: 560, mx: "auto" }}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CRUDModal
        open={crudOpen}
        onClose={(reason) => {
          setCrudOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setNameDraft("")
            setSelectedId(null)
            setCrudMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "staffPositionsModal1",
          crudMode: crudMode,
          id: selectedId || undefined,
          itemLabel: nameDraft,
        }}
        title={crudMode === "create" ? "Add position" : "Edit position"}
        icon={<PositionIcon />}
        mode={crudMode}
        onSave={save}
      >
        <TextField
          label="Position title"
          fullWidth
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="e.g. Operations Manager"
          helperText="Shown in the employee form as a selectable option."
        />
      </CRUDModal>
    </Box>
  )
}
