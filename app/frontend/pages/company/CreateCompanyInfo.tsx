import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany, CompanySetup as CompanySetupType } from "../../../backend/context/CompanyContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Divider,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Paper
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BusinessIcon from "@mui/icons-material/Business";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DescriptionIcon from "@mui/icons-material/Description";
import { useSettings } from "../../../backend/context/SettingsContext";
import { DEFAULT_PERMISSIONS } from "../../../backend/interfaces/Company";
import { themeConfig } from "../../../theme/AppTheme"

const CreateCompanyInfo: React.FC = () => {
  const { dispatch: companyDispatch, createCompany, saveCompanySetup } = useCompany();
  const { state: settingsState } = useSettings();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState<boolean>(false);
  const [createDefaultSite, setCreateDefaultSite] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  
  const [companySetup, setCompanySetup] = useState<CompanySetupType>({
    id: "",
    name: "",
    legalName: "",
    companyType: "hospitality",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    contact: {
      email: "",
      phone: "",
      website: "",
    },
    business: {
      taxId: "",
      registrationNumber: "",
      industry: "",
      businessType: "",
    },
    settings: {
      currency: "USD",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      fiscalYearStart: "01/01",
      enableNotifications: true,
      enableMultiLocation: false,
      workingDays: ["1", "2", "3", "4", "5"],
      workingHours: {
        start: "09:00",
        end: "17:00",
      }
    },
    branding: {
      logo: "",
      primaryColor: themeConfig.brandColors.navy,
      secondaryColor: themeConfig.brandColors.offWhite,
    },
    registrationDetails: {
      registrationNumber: "",
      taxId: "",
      vatNumber: "",
      registrationCountry: "",
    },
    financialDetails: {
      currency: "USD",
      paymentTerms: "",
      creditLimit: 0,
      bankDetails: {
        bankName: "",
        accountNumber: "",
        sortCode: "",
        iban: "",
        swift: "",
      }
    },
    contactPersons: {
      primary: {
        name: "",
        email: "",
        phone: "",
        role: "",
      },
      billing: {
        name: "",
        email: "",
        phone: "",
      },
      technical: {
        name: "",
        email: "",
        phone: "",
      }
    },
    contractSettings: {
      defaultTemplateId: "",
      autoGenerateOnCreation: false,
    },
    createdAt: Date.now()
  });
  
  const [description, setDescription] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>,
    section?: "address" | "contact" | "business" | "branding" | "settings" | "registrationDetails" | "financialDetails" | "contactPersons" | "contractSettings"
  ) => {
    const name = e.target.name || "";
    const value = e.target.value;
    
    if (section) {
      if (section === "contactPersons" && name.includes(".")) {
        const [personType, field] = name.split(".");
        setCompanySetup((prev) => ({
          ...prev,
          contactPersons: {
            ...prev.contactPersons,
            [personType]: {
              ...prev.contactPersons?.[personType as keyof typeof prev.contactPersons],
              [field]: value,
            } as any,
          },
        }));
      } else if (section === "financialDetails" && name.includes(".")) {
        const [detailType, field] = name.split(".");
        if (detailType === "bankDetails") {
          setCompanySetup((prev) => ({
            ...prev,
            financialDetails: {
              ...prev.financialDetails!,
              bankDetails: {
                ...prev.financialDetails?.bankDetails,
                [field]: value,
              },
            },
          }));
        } else {
          setCompanySetup((prev) => ({
            ...prev,
            financialDetails: {
              ...prev.financialDetails!,
              [detailType]: value,
            },
          }));
        }
      } else {
        setCompanySetup((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            [name]: value,
          },
        }));
      }
    } else {
      setCompanySetup((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCreateCompany = async () => {
    if (!settingsState.auth?.uid) {
      setSnackbar({
        open: true,
        message: "You must be logged in to create a company",
        severity: "error",
      });
      return;
    }
    
    if (!companySetup.name) {
      setSnackbar({
        open: true,
        message: "Company name is required",
        severity: "error",
      });
      return;
    }
    
    setSaving(true);
    try {
      // Use context function to create company
      const companyID = await createCompany({
        name: companySetup.name,
        legalName: companySetup.legalName || companySetup.name,
        companyType: companySetup.companyType,
        address: companySetup.address,
        contact: companySetup.contact,
        business: companySetup.business,
        settings: companySetup.settings,
        branding: companySetup.branding,
        registrationDetails: companySetup.registrationDetails,
        financialDetails: companySetup.financialDetails,
        contactPersons: companySetup.contactPersons,
        contractSettings: companySetup.contractSettings,
        createdBy: settingsState.auth?.uid,
        permissions: DEFAULT_PERMISSIONS,
        createDefaultSite: createDefaultSite
      });
      
      // Save company setup data
      const combinedData = {
        ...companySetup,
        id: companyID,
        description: description
      };
      
      // Save company setup using Company context
      await saveCompanySetup(combinedData);
      console.log("Company setup saved successfully:", companyID);
      
      // Update company context
      companyDispatch({
        type: "SET_COMPANY_ID",
        payload: companyID
      });
      
      companyDispatch({
        type: "SET_COMPANY",
        payload: {
          companyID: companyID,
          companyName: companySetup.name,
          companyLogo: "",
          companyAddress: companySetup.address.street || '',
          companyPhone: companySetup.contact.phone || '',
          companyEmail: companySetup.contact.email || '',
          companyWebsite: companySetup.contact.website || '',
          companyDescription: description,
          companyIndustry: companySetup.business.industry,
          companySize: "",
          companyType: companySetup.companyType,
          companyStatus: "active",
          companyCreated: new Date().toISOString(),
          companyUpdated: new Date().toISOString(),
          permissions: DEFAULT_PERMISSIONS
        }
      });
      
      setSnackbar({
        open: true,
        message: "Company created successfully! Now let's set up your first site.",
        severity: "success",
      });
      
      // Switch to site management tab
      setTimeout(() => {
        navigate("/CreateCompany");
      }, 2000);
      
    } catch (error) {
      console.error("Error creating company:", error);
      setSnackbar({
        open: true,
        message: "Failed to create company",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create New Company
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter comprehensive information about the company. This form is used by administrators to set up new companies.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<BusinessIcon />} label="Basic Information" />
          <Tab icon={<ContactMailIcon />} label="Contact Details" />
          <Tab icon={<AccountBalanceIcon />} label="Business & Financial" />
          <Tab icon={<DescriptionIcon />} label="Contract Settings" />
        </Tabs>
      </Paper>

      <Card>
        <CardContent>
          {/* Basic Information Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Basic Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox checked={createDefaultSite} onChange={(e) => setCreateDefaultSite(e.target.checked)} />}
                    label="Create a default site (Main Site)"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Company Name"
                    name="name"
                    value={companySetup.name}
                    onChange={handleChange}
                    helperText="Official trading name"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Legal Name"
                    name="legalName"
                    value={companySetup.legalName}
                    onChange={handleChange}
                    helperText="Registered legal name (if different)"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Company Type</InputLabel>
                    <Select
                      name="companyType"
                      value={companySetup.companyType}
                      label="Company Type"
                      onChange={(e) => handleChange(e)}
                    >
                      <MenuItem value="hospitality">Hospitality</MenuItem>
                      <MenuItem value="supplier">Supplier</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Industry"
                    name="industry"
                    value={companySetup.business.industry}
                    onChange={(e) => handleChange(e, "business")}
                    helperText="Primary industry sector"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company Description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
                    helperText="Brief description of the company"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Address Information
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="street"
                    value={companySetup.address.street}
                    onChange={(e) => handleChange(e, "address")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="City"
                    name="city"
                    value={companySetup.address.city}
                    onChange={(e) => handleChange(e, "address")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="State/Province"
                    name="state"
                    value={companySetup.address.state}
                    onChange={(e) => handleChange(e, "address")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Zip/Postal Code"
                    name="zipCode"
                    value={companySetup.address.zipCode}
                    onChange={(e) => handleChange(e, "address")}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Country"
                    name="country"
                    value={companySetup.address.country}
                    onChange={(e) => handleChange(e, "address")}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Contact Details Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Contact Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Primary Contact
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={companySetup.contact.email}
                    onChange={(e) => handleChange(e, "contact")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={companySetup.contact.phone}
                    onChange={(e) => handleChange(e, "contact")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Website"
                    name="website"
                    value={companySetup.contact.website}
                    onChange={(e) => handleChange(e, "contact")}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Contact Persons
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Primary Contact Person</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Name"
                            name="primary.name"
                            value={companySetup.contactPersons?.primary?.name || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Role"
                            name="primary.role"
                            value={companySetup.contactPersons?.primary?.role || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Email"
                            name="primary.email"
                            type="email"
                            value={companySetup.contactPersons?.primary?.email || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Phone"
                            name="primary.phone"
                            value={companySetup.contactPersons?.primary?.phone || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
                
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Billing Contact</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Name"
                            name="billing.name"
                            value={companySetup.contactPersons?.billing?.name || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Email"
                            name="billing.email"
                            type="email"
                            value={companySetup.contactPersons?.billing?.email || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Phone"
                            name="billing.phone"
                            value={companySetup.contactPersons?.billing?.phone || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
                
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Technical Contact</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Name"
                            name="technical.name"
                            value={companySetup.contactPersons?.technical?.name || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Email"
                            name="technical.email"
                            type="email"
                            value={companySetup.contactPersons?.technical?.email || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Phone"
                            name="technical.phone"
                            value={companySetup.contactPersons?.technical?.phone || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Business & Financial Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Business & Financial Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Registration Details
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Registration Number"
                    name="registrationNumber"
                    value={companySetup.registrationDetails?.registrationNumber || ""}
                    onChange={(e) => handleChange(e, "registrationDetails")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Tax ID / VAT Number"
                    name="taxId"
                    value={companySetup.registrationDetails?.taxId || ""}
                    onChange={(e) => handleChange(e, "registrationDetails")}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="VAT Number"
                    name="vatNumber"
                    value={companySetup.registrationDetails?.vatNumber || ""}
                    onChange={(e) => handleChange(e, "registrationDetails")}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Registration Country"
                    name="registrationCountry"
                    value={companySetup.registrationDetails?.registrationCountry || ""}
                    onChange={(e) => handleChange(e, "registrationDetails")}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Financial Details
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      name="currency"
                      value={companySetup.financialDetails?.currency || "USD"}
                      label="Currency"
                      onChange={(e) => handleChange(e, "financialDetails")}
                    >
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="CAD">CAD</MenuItem>
                      <MenuItem value="AUD">AUD</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    name="paymentTerms"
                    value={companySetup.financialDetails?.paymentTerms || ""}
                    onChange={(e) => handleChange(e, "financialDetails")}
                    helperText="e.g., Net 30, Net 60"
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Credit Limit"
                    name="creditLimit"
                    type="number"
                    value={companySetup.financialDetails?.creditLimit || 0}
                    onChange={(e) => handleChange(e, "financialDetails")}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Bank Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Bank Name"
                            name="bankDetails.bankName"
                            value={companySetup.financialDetails?.bankDetails?.bankName || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Account Number"
                            name="bankDetails.accountNumber"
                            value={companySetup.financialDetails?.bankDetails?.accountNumber || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Sort Code / Routing Number"
                            name="bankDetails.sortCode"
                            value={companySetup.financialDetails?.bankDetails?.sortCode || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="IBAN"
                            name="bankDetails.iban"
                            value={companySetup.financialDetails?.bankDetails?.iban || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="SWIFT / BIC"
                            name="bankDetails.swift"
                            value={companySetup.financialDetails?.bankDetails?.swift || ""}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Contract Settings Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Contract Settings
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={companySetup.contractSettings?.autoGenerateOnCreation || false}
                        onChange={(e) => {
                          setCompanySetup((prev) => ({
                            ...prev,
                            contractSettings: {
                              ...prev.contractSettings,
                              autoGenerateOnCreation: e.target.checked,
                            },
                          }));
                        }}
                      />
                    }
                    label="Auto-generate contract on company creation"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Contract settings can be updated after company creation from the relevant management areas.
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}

          <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleCreateCompany}
              disabled={saving || !companySetup.name}
            >
              Create Company
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateCompanyInfo;
