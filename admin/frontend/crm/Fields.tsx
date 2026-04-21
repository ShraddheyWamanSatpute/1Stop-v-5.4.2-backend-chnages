import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon, Tune as FieldsIcon } from "@mui/icons-material";
import { db, onValue, push, ref, remove, set, update } from "../../backend/services/Firebase";
import DataHeader from "../../../app/frontend/components/reusable/DataHeader";
import type { CustomFieldDefinition, CustomFieldType } from "./types";
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../../../app/frontend/components/reusable/CRUDModal";
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard";
import FieldCRUDForm, { type FieldCRUDFormHandle } from "./forms/FieldCRUDForm";

const Fields: React.FC = () => {
  const location = useLocation();
  const toPascalLabel = useCallback((raw: any) => {
    const s = String(raw || "").trim();
    if (!s) return "—";
    return s
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, []);

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CustomFieldType[]>([]);
  const [showInTableFilter, setShowInTableFilter] = useState<Array<"yes" | "no">>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // CRUD modal
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create");
  const [selectedField, setSelectedField] = useState<CustomFieldDefinition | null>(null);
  const fieldFormRef = useRef<FieldCRUDFormHandle | null>(null);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);

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
        setFieldsLoading(false);
      },
      () => setFieldsLoading(false),
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fields.filter((f) => {
      if (typeFilter.length > 0 && !typeFilter.includes((f.type as CustomFieldType) || "text")) return false;
      if (showInTableFilter.length > 0) {
        const v = Boolean(f.showInTable);
        const isYes = showInTableFilter.includes("yes");
        const isNo = showInTableFilter.includes("no");
        if (v && !isYes) return false;
        if (!v && !isNo) return false;
      }
      if (!q) return true;
      return (
        String(f.label || "").toLowerCase().includes(q) ||
        String(f.id || "").toLowerCase().includes(q) ||
        String(f.type || "").toLowerCase().includes(q)
      );
    });
  }, [fields, search, showInTableFilter, typeFilter]);

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filtered.slice(startIndex, startIndex + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const openCreate = useCallback(() => {
    setSelectedField(null);
    setCrudMode("create");
    setCrudOpen(true);
  }, []);

  const openView = useCallback((f: CustomFieldDefinition) => {
    setSelectedField(f);
    setCrudMode("view");
    setCrudOpen(true);
  }, []);

  const openEdit = useCallback((f: CustomFieldDefinition) => {
    setSelectedField(f);
    setCrudMode("edit");
    setCrudOpen(true);
  }, []);

  const resetCrudEntity = useCallback(() => {
    setSelectedField(null);
    setCrudMode("create");
  }, []);

  const handleCrudModalClose = useCallback(
    (reason?: CRUDModalCloseReason) => {
      setCrudOpen(false);
      if (isCrudModalHardDismiss(reason)) {
        resetCrudEntity();
      }
    },
    [resetCrudEntity],
  );

  const saveField = useCallback(
    async (payload: {
      label: string;
      type: CustomFieldType;
      options: string[];
      required: boolean;
      showInTable: boolean;
      appliesTo: "contacts" | "clients" | "both";
    }) => {
      const now = Date.now();
      const modeSnapshot = crudMode;
      const dbPayload = {
        label: payload.label,
        type: payload.type,
        options: payload.options,
        required: Boolean(payload.required),
        showInTable: Boolean(payload.showInTable),
        appliesTo: payload.appliesTo || "both",
        updatedAt: now,
      };

      if (selectedField && crudMode === "edit") {
        await update(ref(db, `admin/crm/fields/${selectedField.id}`), dbPayload);
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "crmCustomField",
          crudMode: modeSnapshot,
          id: selectedField.id,
          itemLabel: payload.label,
        });
        setCrudOpen(false);
        resetCrudEntity();
        return;
      }

      const newRef = push(ref(db, `admin/crm/fields`));
      await set(newRef, { ...dbPayload, createdAt: now });
      const newId = newRef.key || "";
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "crmCustomField",
        crudMode: modeSnapshot,
        id: newId || undefined,
        itemLabel: payload.label,
      });
      setCrudOpen(false);
      resetCrudEntity();
    },
    [crudMode, location.pathname, resetCrudEntity, selectedField],
  );

  const askDelete = useCallback((f: CustomFieldDefinition) => {
    setFieldToDelete(f);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!fieldToDelete?.id) return;
    await remove(ref(db, `admin/crm/fields/${fieldToDelete.id}`));
    setDeleteConfirmOpen(false);
    setFieldToDelete(null);
  }, [fieldToDelete]);

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => {
          setSearch(t);
          setPage(0);
        }}
        searchPlaceholder="Search fields…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Type",
            options: [
              "text",
              "number",
              "date",
              "select",
              "multiselect",
              "checkbox",
              "email",
              "phone",
              "url",
            ].map((t) => ({ id: t, name: toPascalLabel(t) })),
            selectedValues: typeFilter,
            onSelectionChange: (values) => {
              setTypeFilter(values as CustomFieldType[]);
              setPage(0);
            },
          },
          {
            label: "Show In Table",
            options: [
              { id: "yes", name: "yes" },
              { id: "no", name: "no" },
            ],
            selectedValues: showInTableFilter as any,
            onSelectionChange: (values) => {
              setShowInTableFilter(values as any);
              setPage(0);
            },
          },
        ]}
        onCreateNew={openCreate}
        createButtonLabel="Add Field"
      />

      {fieldsLoading ? <Alert severity="info">Loading fields…</Alert> : null}

      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 300px)",
          minHeight: 400,
        }}
      >
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 220 }}>Label</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Type</TableCell>
                <TableCell sx={{ minWidth: 140 }} align="center">Applies To</TableCell>
                <TableCell sx={{ minWidth: 110 }} align="center">Required</TableCell>
                <TableCell sx={{ minWidth: 140 }} align="center">Show In Table</TableCell>
                <TableCell sx={{ minWidth: 140 }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={FieldsIcon}
                      title="No fields found"
                      description="Create your first field, or adjust your filters."
                      cardSx={{ maxWidth: 560, mx: "auto" }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((f) => (
                  <TableRow key={f.id} hover sx={{ cursor: "pointer" }} onClick={() => openView(f)}>
                    <TableCell>
                      <Typography fontWeight={800}>{f.label || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {f.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{toPascalLabel(f.type)}</TableCell>
                    <TableCell align="center">{(f.appliesTo || "both") === "both" ? "Both" : f.appliesTo === "clients" ? "Clients" : "Contacts"}</TableCell>
                    <TableCell align="center">{f.required ? "✓" : ""}</TableCell>
                    <TableCell align="center">{f.showInTable ? "✓" : ""}</TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                        <IconButton size="small" title="Edit" onClick={() => openEdit(f)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(f)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
          />
        </Box>
      </Paper>

      <CRUDModal
        open={crudOpen}
        onClose={handleCrudModalClose}
        workspaceFormShortcut={{
          crudEntity: "crmCustomField",
          crudMode,
          id: selectedField?.id,
          itemLabel: selectedField?.label || undefined,
        }}
        title={crudMode === "create" ? "Create Field" : crudMode === "edit" ? "Edit Field" : "Field"}
        subtitle={selectedField?.id ? `Field: ${selectedField.id}` : undefined}
        mode={crudMode}
        formRef={fieldFormRef as any}
        onEdit={crudMode === "view" && selectedField ? () => setCrudMode("edit") : undefined}
        onSave={crudMode === "view" ? undefined : async () => void 0}
      >
        <FieldCRUDForm ref={fieldFormRef} field={selectedField} mode={crudMode} onSave={saveField} />
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete field <strong>{fieldToDelete?.label || "—"}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Close</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={!fieldToDelete?.id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Fields;
