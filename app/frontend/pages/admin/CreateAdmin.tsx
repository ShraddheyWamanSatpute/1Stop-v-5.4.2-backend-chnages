import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useSettings } from "../../../backend/context/SettingsContext";
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys";
import { auth, db, get, ref } from "../../../backend/services/Firebase";

const CreateAdmin: React.FC<{ embed?: boolean }> = ({ embed = false }) => {
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    firstName: "",
    lastName: "",
  });

  const [allCompanies, setAllCompanies] = useState<Array<{ companyID: string; companyName: string }>>([]);

  useEffect(() => {
    loadAllCompanies();
  }, []);

  const loadAllCompanies = async () => {
    try {
      const companiesRef = ref(db, "companies");
      const snapshot = await get(companiesRef);
      
      if (snapshot.exists()) {
        const companiesData = snapshot.val();
        const companiesArray = Object.keys(companiesData).map((id) => ({
          companyID: id,
          companyName: companiesData[id].companyName || "Unknown Company",
        }));
        setAllCompanies(companiesArray);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      showSnackbar("Failed to load companies", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateAdmin = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.displayName) {
      showSnackbar("Email, password, and display name are required", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    if (formData.password.length < 6) {
      showSnackbar("Password must be at least 6 characters", "error");
      return;
    }

    if (allCompanies.length === 0) {
      showSnackbar("No companies found. Please create at least one company first.", "error");
      return;
    }

    setLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error("You must be logged in as a super admin to create another admin user.");
      }
      const token = await auth.currentUser.getIdToken();
      const fnBase = getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      });
      const resp = await fetch(`${fnBase}/createSuperAdminUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          displayName: formData.displayName.trim(),
          firstName: formData.firstName || "",
          lastName: formData.lastName || "",
          addToAllCompanies: true,
        }),
      });
      const data = await resp.json();
      if (!data?.success) {
        throw new Error(data?.error || "Failed to create admin account");
      }

      showSnackbar(
        `Admin account created successfully! Added to ${allCompanies.length} companies.`,
        "success"
      );

      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        displayName: "",
        firstName: "",
        lastName: "",
      });

      // Optionally navigate after a delay
      setTimeout(() => {
        navigate("/Admin");
      }, 2000);
    } catch (error: any) {
      console.error("Error creating admin:", error);
      let errorMessage = "Failed to create admin account";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already in use";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }
      
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={embed ? undefined : { maxWidth: 800, mx: "auto", p: 3 }}>
      {!embed ? (
        <>
          <Typography variant="h4" gutterBottom>
            Create Admin Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new admin account that will have owner access to all companies in the system.
          </Typography>
        </>
      ) : null}

      {allCompanies.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This admin will be added to {allCompanies.length} company(ies) with owner role:
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            {allCompanies.slice(0, 5).map((company) => (
              <li key={company.companyID}>{company.companyName}</li>
            ))}
            {allCompanies.length > 5 && (
              <li>... and {allCompanies.length - 5} more</li>
            )}
          </Box>
        </Alert>
      )}

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                helperText="Admin account email address"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Display Name"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                helperText="Full name to display"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                helperText="Minimum 6 characters"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/Admin")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleCreateAdmin}
              disabled={loading || allCompanies.length === 0}
            >
              Create Admin Account
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateAdmin;
