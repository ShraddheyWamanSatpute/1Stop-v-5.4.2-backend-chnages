import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { db, onValue, push, ref, set, update } from "../../../backend/services/Firebase";
import DataHeader from "../../components/reusable/DataHeader";

type ProjectStatus = "active" | "on_hold" | "completed";

interface AdminProject {
  id: string;
  name: string;
  status: ProjectStatus;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface AdminProjectsProps {
  embed?: boolean;
  hideHeader?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  sortValue?: "updatedAt" | "name";
  sortDirection?: "asc" | "desc";
  onSortChange?: (value: "updatedAt" | "name", direction: "asc" | "desc") => void;
  createHandlerRef?: React.MutableRefObject<(() => void) | null>;
}

const AdminProjects: React.FC<AdminProjectsProps> = ({
  embed,
  hideHeader,
  searchTerm,
  onSearchChange,
  sortValue,
  sortDirection,
  onSortChange,
  createHandlerRef,
}) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [draft, setDraft] = useState<{ name: string; status: ProjectStatus; description: string }>({
    name: "",
    status: "active",
    description: "",
  });
  const [localSortValue, setLocalSortValue] = useState<"updatedAt" | "name">("updatedAt");
  const [localSortDirection, setLocalSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    const projectsRef = ref(db, `admin/projects`);
    const unsubscribe = onValue(
      projectsRef,
      (snap) => {
        const val = snap.val() || {};
        const rows: AdminProject[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          name: raw?.name || "",
          status: (raw?.status as ProjectStatus) || "active",
          description: raw?.description || "",
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }));
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        setProjects(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, []);

  // Allow parent to trigger "Add Project" from a shared DataHeader
  useEffect(() => {
    if (!createHandlerRef) return;
    createHandlerRef.current = () => openCreate();
    return () => {
      createHandlerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createHandlerRef, projects.length]);

  const effectiveSearch = searchTerm !== undefined ? searchTerm : search;
  const setEffectiveSearch = onSearchChange || setSearch;
  const effectiveSortValue = sortValue !== undefined ? sortValue : localSortValue;
  const effectiveSortDirection = sortDirection !== undefined ? sortDirection : localSortDirection;
  const setEffectiveSort = onSortChange
    ? onSortChange
    : (value: "updatedAt" | "name", direction: "asc" | "desc") => {
        setLocalSortValue(value);
        setLocalSortDirection(direction);
      };

  const filtered = useMemo(() => {
    const q = (effectiveSearch || "").trim().toLowerCase();
    const base = projects.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      );
    });
    const dir = effectiveSortDirection === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      if (effectiveSortValue === "name") return a.name.localeCompare(b.name) * dir;
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir;
    });
  }, [projects, effectiveSearch, effectiveSortValue, effectiveSortDirection]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", status: "active", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: AdminProject) => {
    setEditing(p);
    setDraft({ name: p.name || "", status: p.status || "active", description: p.description || "" });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    const now = Date.now();

    if (editing) {
      const projectRef = ref(db, `admin/projects/${editing.id}`);
      await update(projectRef, {
        name: draft.name.trim(),
        status: draft.status,
        description: draft.description,
        updatedAt: now,
      });
    } else {
      const projectsRef = ref(db, `admin/projects`);
      const newRef = push(projectsRef);
      await set(newRef, {
        name: draft.name.trim(),
        status: draft.status,
        description: draft.description,
        createdAt: now,
        updatedAt: now,
      });
    }

    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <Box sx={{ p: embed ? 0 : 3 }}>
      {!hideHeader ? (
        <DataHeader
          showDateControls={false}
          showDateTypeSelector={false}
          searchTerm={effectiveSearch}
          onSearchChange={(t) => setEffectiveSearch(t)}
          searchPlaceholder="Search projects…"
          sortOptions={[
            { value: "updatedAt", label: "Last updated" },
            { value: "name", label: "Name" },
          ]}
          sortValue={effectiveSortValue}
          sortDirection={effectiveSortDirection}
          onSortChange={(value, direction) => setEffectiveSort(value as any, direction)}
          onCreateNew={openCreate}
          createButtonLabel="Add Project"
          singleRow={embed ? true : false}
        />
      ) : null}

      <Card>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">No projects yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} hover sx={{ cursor: "pointer" }} onClick={() => openEdit(p)}>
                      <TableCell>
                        <Typography fontWeight={600}>{p.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.status}
                          color={p.status === "active" ? "success" : p.status === "on_hold" ? "warning" : "default"}
                        />
                      </TableCell>
                      <TableCell>{p.description || "—"}</TableCell>
                      <TableCell>{new Date(p.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filtered.length} of {projects.length}
            </Typography>
          </Box>

          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            {!embed ? (
              <Button
                variant="outlined"
                disabled={filtered.length === 0}
                onClick={() => navigate("/Admin/Tasks")}
              >
                View all tasks
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={8}>
              <TextField
                label="Project Name"
                required
                fullWidth
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Select
                fullWidth
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ProjectStatus }))}
              >
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="on_hold">on_hold</MenuItem>
                <MenuItem value="completed">completed</MenuItem>
              </Select>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!draft.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProjects;

