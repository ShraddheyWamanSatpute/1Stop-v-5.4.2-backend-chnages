import React, { useState, useEffect } from "react";
import { useCompany } from "../../../backend/context/CompanyContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Divider,
  Chip,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import { db, ref, get } from "../../../backend/services/Firebase";
import type { ExtendedCompany, CompanySetup } from "../../../backend/interfaces/Company";

const AdminViewer: React.FC = () => {
  const { state: companyState } = useCompany();
  const [companyData, setCompanyData] = useState<ExtendedCompany | null>(null);
  const [companySetup, setCompanySetup] = useState<CompanySetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (companyState.companyID) {
      loadCompanyData();
    }
  }, [companyState.companyID]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      // Load company data
      const companyRef = ref(db, `companies/${companyState.companyID}`);
      const companySnapshot = await get(companyRef);
      
      if (companySnapshot.exists()) {
        setCompanyData({
          ...companySnapshot.val(),
          companyID: companyState.companyID,
        });
      }

      // Load company setup
      const setupRef = ref(db, `companySetup/${companyState.companyID}`);
      const setupSnapshot = await get(setupRef);
      
      if (setupSnapshot.exists()) {
        setCompanySetup(setupSnapshot.val());
      }
    } catch (error) {
      console.error("Error loading company data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!companyState.companyID) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Please select a company to view details
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading company data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Company Viewer - {companyState.companyName}
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Basic Information" />
          <Tab label="Contact Details" />
          <Tab label="Business Information" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          {activeTab === 0 && companyData && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={companyData.companyName || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Type"
                  value={companyData.companyType || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={companyData.companyDescription || ""}
                  multiline
                  rows={3}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Industry"
                  value={companyData.companyIndustry || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Status"
                  value={companyData.companyStatus || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Created"
                  value={
                    companyData.companyCreated
                      ? new Date(companyData.companyCreated).toLocaleString()
                      : "N/A"
                  }
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Updated"
                  value={
                    companyData.companyUpdated
                      ? new Date(companyData.companyUpdated).toLocaleString()
                      : "N/A"
                  }
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && companyData && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={companyData.companyEmail || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={companyData.companyPhone || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={companyData.companyWebsite || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={companyData.companyAddress || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && companySetup && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Registration Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Registration Number"
                  value={companySetup.registrationDetails?.registrationNumber || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tax ID"
                  value={companySetup.registrationDetails?.taxId || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="VAT Number"
                  value={companySetup.registrationDetails?.vatNumber || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Financial Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  value={companySetup.financialDetails?.currency || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Payment Terms"
                  value={companySetup.financialDetails?.paymentTerms || ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && companyData && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Data Management Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              {companyData.dataManagement &&
                Object.entries(companyData.dataManagement).map(([key, value]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <TextField
                      fullWidth
                      label={key.charAt(0).toUpperCase() + key.slice(1)}
                      value={value}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminViewer;
