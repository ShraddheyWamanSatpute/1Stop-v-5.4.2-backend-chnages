import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { usePOS } from "../../../backend/context/POSContext";
import DataHeader from "../../../frontend/components/reusable/DataHeader";
import TillScreenForm from "../../../frontend/components/pos/forms/TillScreenForm";


interface Screen {
  id: string;
  name: string;
  description: string;
  layout: string;
  lastModified: string;
}

const ScreenManagement: React.FC = () => {
  const { createTillScreen, updateTillScreen, refreshTillScreens } = usePOS();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [loading, setLoading] = useState(true);

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Define sort options for DataHeader
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "description", label: "Description" },
    { value: "layout", label: "Layout" },
    { value: "lastModified", label: "Last Modified" },
  ];

  // Handle sort change from DataHeader
  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortBy(field);
    setSortDirection(direction);
  };

  // Handle export from DataHeader
  const handleExport = (format: "csv" | "pdf") => {
    console.log(`Exporting screens as ${format}`);
    // Export functionality would be implemented here
    // For now, just log the action
  };

  // Add filtered and sorted screens calculation
  const filteredAndSortedScreens = screens
    .filter(
      (screen) =>
        screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.layout.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortBy) return 0;
      
      const aValue = a[sortBy as keyof Screen];
      const bValue = b[sortBy as keyof Screen];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, fetch screens from your database
    const mockScreens: Screen[] = [
      {
        id: "1",
        name: "Main Menu",
        description: "Primary menu screen for all products",
        layout: "grid",
        lastModified: "2023-10-15",
      },
      {
        id: "2",
        name: "Drinks Menu",
        description: "Screen for beverage items",
        layout: "list",
        lastModified: "2023-10-10",
      },
      {
        id: "3",
        name: "Specials",
        description: "Daily special items",
        layout: "featured",
        lastModified: "2023-10-12",
      },
    ];

    setScreens(mockScreens);
    setLoading(false);
  }, []);


  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentScreen(null);
  };

  const handleSaveScreen = () => {
    // In a real app, save the screen to your database
    handleCloseDialog();
  };

  const handleDeleteScreen = (id: string) => {
    // In a real app, delete the screen from your database
    setScreens(screens.filter((screen) => screen.id !== id));
  };

  // CRUD Modal handlers
  const handleOpenCrudModal = (screen: Screen | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedScreen(screen);
    setCrudMode(mode);
    setCrudModalOpen(true);
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false);
    setSelectedScreen(null);
    setCrudMode('create');
  }

  const handleSaveCrudModal = async (formData: any) => {
    try {
      if (crudMode === 'create') {
        // Create new screen
        await createTillScreen(formData);
      } else if (crudMode === 'edit' && selectedScreen) {
        // Update existing screen
        await updateTillScreen(selectedScreen.id, formData);
      }
      handleCloseCrudModal();
      // Refresh screens after save
      await refreshTillScreens();
    } catch (error) {
      console.error('Failed to save screen:', error);
    }
  }

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading screens...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <DataHeader
        title="Screen Management"
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search screens..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenCrudModal(null, 'create')}
        createButtonLabel="Add New Screen"
      />

      <Paper elevation={2} sx={{ p: 2, mb: 3, mt: 3 }}>
        <Typography variant="body1" gutterBottom>
          Manage your POS screens here. Create, edit, and organize screens for
          different purposes.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {filteredAndSortedScreens.map((screen) => (
          <Grid item xs={12} sm={6} md={4} key={screen.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2">
                  {screen.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {screen.description}
                </Typography>
                <Typography variant="body2">Layout: {screen.layout}</Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Last modified: {screen.lastModified}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenCrudModal(screen, 'edit')}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteScreen(screen.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentScreen ? "Edit Screen" : "Add New Screen"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Screen Name"
            fullWidth
            variant="outlined"
            defaultValue={currentScreen?.name || ""}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            defaultValue={currentScreen?.description || ""}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Layout Type"
            fullWidth
            variant="outlined"
            defaultValue={currentScreen?.layout || "grid"}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveScreen}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <TillScreenForm
        open={crudModalOpen}
        onClose={handleCloseCrudModal}
        tillScreen={selectedScreen}
        mode={crudMode}
        onSave={handleSaveCrudModal}
        onModeChange={setCrudMode}
      />
    </Box>
  );
};

export default ScreenManagement;
