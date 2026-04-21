"use client"

import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  MenuItem,
  Chip,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material"
import { useState, useEffect } from "react"
import { useCompany, CompanySetup as CompanySetupType, Site, Subsite, Team } from "../../../backend/context/CompanyContext"
import { EditPermission } from "../../components/company/PermissionFilter"
import RequireCompanyContext from "../../components/global/RequireCompanyContext"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import BusinessIcon from "@mui/icons-material/Business"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import SecurityIcon from "@mui/icons-material/Security"
import AssignmentIcon from "@mui/icons-material/Assignment"
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd"
import GroupIcon from "@mui/icons-material/Group"
import Permissions from "./Permissions"
import Checklists from "./Checklists"
import MyChecklist from "./MyChecklist"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
import { themeConfig } from "../../../theme/AppTheme"

const CompanySetup = () => {
  const { state: companyState, createSite, createSubsite, createTeam, fetchCompanySetup, saveCompanySetup, selectSite } = useCompany()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  // Site management state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [subsiteDialogOpen, setSubsiteDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [selectedSiteID, setSelectedSiteID] = useState<string | null>(null)
  const [selectedSubsiteID, setSelectedSubsiteID] = useState<string | null>(null)
  
  // New site/subsite/team form data
  const [newSite, setNewSite] = useState<Omit<Site, "siteID" | "companyID">>({
    name: "",
    description: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    subsites: {},
    teams: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  
  const [newSubsite, setNewSubsite] = useState<Omit<Subsite, 'subsiteID'>>({
    name: "",
    description: "",
    location: "",
    teams: {},
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: ""
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  
  const [newTeam, setNewTeam] = useState<Omit<Team, 'teamID'>>({
    name: "",
    description: "",
    members: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  })

  const [companyData, setCompanyData] = useState<Omit<CompanySetupType, "id">>({
    name: "",
    legalName: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
    },
    contact: {
      phone: "",
      email: "",
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
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      fiscalYearStart: "01/01",
      enableNotifications: true,
      enableMultiLocation: false,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workingHours: {
        start: "09:00",
        end: "17:00",
      },
    },
    branding: {
      logo: "",
      primaryColor: themeConfig.brandColors.navy,
      secondaryColor: themeConfig.brandColors.offWhite,
    },
    createdAt: Date.now(),
  })

  useEffect(() => {
    const loadCompanySetup = async () => {
      if (companyState.companyID) {
        try {
          setLoading(true)
          const setup = await fetchCompanySetup()
          if (setup) {
            const { id, ...setupData } = setup
            const safeSetupData = {
              ...companyData, // Keep default values as fallback
              ...setupData,   // Override with fetched data
              // Ensure nested objects are properly merged with defaults
              address: { ...companyData.address, ...(setupData.address || {}) },
              contact: { ...companyData.contact, ...(setupData.contact || {}) },
              business: { ...companyData.business, ...(setupData.business || {}) },
              settings: { 
                ...companyData.settings, 
                ...(setupData.settings || {}),
                // Ensure nested objects within settings are properly merged
                workingHours: { 
                  ...companyData.settings.workingHours, 
                  ...(setupData.settings?.workingHours || {}) 
                },
                // Ensure arrays are properly handled
                workingDays: setupData.settings?.workingDays || companyData.settings.workingDays
              },
              branding: { ...companyData.branding, ...(setupData.branding || {}) }
            }
            setCompanyData(safeSetupData)
          }
        } catch (err) {
          console.error("Error loading company setup:", err)
          setError("Failed to load company setup")
        } finally {
          setLoading(false)
        }
      }
    }

    loadCompanySetup()
  }, [companyState.companyID])

  const handleInputChange = (field: string, value: any) => {
    setCompanyData(prev => {
      const keys = field.split('.');
      const newState = { ...prev };
      let currentLevel: any = newState;

      for (let i = 0; i < keys.length - 1; i++) {
        currentLevel = currentLevel[keys[i]] = { ...currentLevel[keys[i]] };
      }

      currentLevel[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  const handleWorkingDaysChange = (day: string) => {
    const currentDays = companyData.settings.workingDays
    const newDays = currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day]

    handleInputChange("settings.workingDays", newDays);
  };

  const handleSave = async () => {
    if (!companyState.companyID) {
      setError("Company or site not selected");
      return;
    }

    try {
      setLoading(true);
      await saveCompanySetup(companyData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving company setup:", err);
      setError("Failed to save company setup");
    } finally {
      setLoading(false);
    }
  };

  // Site management handlers
  const handleCreateSite = async () => {
    if (!companyState.companyID) {
      setError("Company not selected");
      return;
    }

    try {
      setLoading(true);
      await createSite(newSite);
      setSiteDialogOpen(false);
        setNewSite({
        name: "",
        description: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
        subsites: {},
        teams: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating site:", err);
      setError("Failed to create site");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubsite = async () => {
    if (!companyState.companyID || !selectedSiteID) {
      setError("Company or site not selected");
      return;
    }

    try {
      setLoading(true);
      if (selectedSiteID) {
        selectSite(selectedSiteID, "");
      }
      await createSubsite({
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name: newSubsite.name,
        description: newSubsite.description,
        location: newSubsite.location,
        teams: {},
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: ""
        }
      });
      setSubsiteDialogOpen(false);
      setNewSubsite({
        name: "",
        description: "",
        location: "",
        teams: {},
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: ""
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating subsite:", error);
      setError("Failed to create subsite");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!companyState.companyID || !selectedSiteID || !selectedSubsiteID) {
      setError("Company, site, or subsite not selected");
      return;
    }

    try {
      setLoading(true);
      await createTeam(newTeam, selectedSubsiteID);
      setTeamDialogOpen(false);
      setNewTeam({ name: "", description: "", members: [], createdAt: Date.now(), updatedAt: Date.now() });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating team:", err);
      setError("Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Retail",
    "Manufacturing",
    "Education",
    "Hospitality",
    "Real Estate",
    "Other",
  ];

  const businessTypes = ["Corporation", "LLC", "Partnership", "Sole Proprietorship", "Non-Profit", "Other"];

  const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
  ];

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // No loading indicators — UI renders and fills as data arrives

return (
  <RequireCompanyContext>
  <Box>
    <Card sx={{ mb: 2, bgcolor: themeConfig.brandColors.navy, color: "white" }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Company Management
        </Typography>
      </CardContent>
    </Card>
    
    {error && (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )}
    {success && (
      <Alert severity="success" sx={{ mb: 2 }}>
        Changes saved successfully!
      </Alert>
    )}
    
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<BusinessIcon />} iconPosition="start" label="Company Info" />
        <Tab icon={<LocationOnIcon />} iconPosition="start" label="Site Management" />
        <Tab icon={<SecurityIcon />} iconPosition="start" label="Permissions" />
        <Tab icon={<AssignmentIcon />} iconPosition="start" label="Checklists" />
        <Tab icon={<AssignmentIndIcon />} iconPosition="start" label="My Checklists" />
      </Tabs>
    </Box>

    {activeTab === 0 && (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={companyData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Legal Name"
                      value={companyData.legalName}
                      onChange={(e) => handleInputChange("legalName", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={companyData.address.street}
                      onChange={(e) => handleInputChange("address.street", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={companyData.address.city}
                      onChange={(e) => handleInputChange("address.city", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="State"
                      value={companyData.address.state}
                      onChange={(e) => handleInputChange("address.state", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Zip Code"
                      value={companyData.address.zipCode}
                      onChange={(e) => handleInputChange("address.zipCode", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={companyData.contact.phone}
                      onChange={(e) => handleInputChange("contact.phone", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={companyData.contact.email}
                      onChange={(e) => handleInputChange("contact.email", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={companyData.contact.website}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("contact.website", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tax ID"
                      value={companyData.business.taxId}
                      onChange={(e) => handleInputChange("business.taxId", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Industry"
                      value={companyData.business.industry}
                      onChange={(e) => handleInputChange("business.industry", e.target.value)}
                    >
                      {industries.map((industry) => (
                        <MenuItem key={industry} value={industry}>
                          {industry}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Business Type"
                      value={companyData.business.businessType}
                      onChange={(e) => handleInputChange("business.businessType", e.target.value)}
                    >
                      {businessTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Settings
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    fullWidth
                    select
                    label="Currency"
                    value={companyData.settings.currency}
                    onChange={(e) => handleInputChange("settings.currency", e.target.value)}
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency} value={currency}>
                        {currency}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    select
                    label="Timezone"
                    value={companyData.settings.timezone}
                    onChange={(e) => handleInputChange("settings.timezone", e.target.value)}
                  >
                    {timezones.map((timezone) => (
                      <MenuItem key={timezone} value={timezone}>
                        {timezone}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Start Time"
                        type="time"
                        value={companyData.settings.workingHours.start}
                        onChange={(e) => handleInputChange("settings.workingHours.start", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="End Time"
                        type="time"
                        value={companyData.settings.workingHours.end}
                        onChange={(e) => handleInputChange("settings.workingHours.end", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                  <Divider />
                  <Typography variant="subtitle2">Working Days</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {weekDays.map((day) => (
                      <Chip
                        key={day}
                        label={day.slice(0, 3)}
                        clickable
                        color={companyData.settings.workingDays.includes(day) ? "primary" : "default"}
                        onClick={() => handleWorkingDaysChange(day)}
                      />
                    ))}
                  </Box>
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={companyData.settings.enableNotifications}
                        onChange={(e) => handleInputChange("settings.enableNotifications", e.target.checked)}
                      />
                    }
                    label="Enable Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={companyData.settings.enableMultiLocation}
                        onChange={(e) => handleInputChange("settings.enableMultiLocation", e.target.checked)}
                      />
                    }
                    label="Multi-Location Support"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" disabled={loading}>
                Cancel
              </Button>
              <EditPermission module="company" page="settings">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  Save
                </Button>
              </EditPermission>
            </Box>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <EditPermission module="company" page="setup">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">Sites</Typography>
                    <EditPermission module="sites" page="management">
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setSiteDialogOpen(true)}
                        sx={{ mb: 2 }}
                      >
                        Add Site
                      </Button>
                    </EditPermission>
                  </Box>

                  {companyState.sites && companyState.sites.length > 0 ? (
                    <List>
                      {companyState.sites.map((site) => (
                        <Accordion key={site.siteID}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>
                              {site.name}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                {site.description || "No description"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {site.address && Object.values(site.address).some((v) => (v || "").toString().trim())
                                  ? [
                                      site.address.street,
                                      site.address.city,
                                      site.address.state,
                                      site.address.zipCode,
                                      site.address.country,
                                    ]
                                      .filter((v) => (v || "").toString().trim())
                                      .join(", ")
                                  : "No address provided"}
                              </Typography>
                            </Box>

                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                              <Typography variant="subtitle1">Subsites</Typography>
                              <EditPermission module="subsites" page="management">
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => {
                                    setSelectedSiteID(site.siteID);
                                    setSubsiteDialogOpen(true);
                                  }}
                                >
                                  Add Subsite
                                </Button>
                              </EditPermission>
                            </Box>

                            {site.subsites && Object.keys(site.subsites).length > 0 ? (
                              <List>
                                {Object.values(site.subsites).map((subsite) => (
                                  <Accordion key={subsite.subsiteID}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography>{subsite.name}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          {subsite.description || "No description"}
                                        </Typography>
                                        {subsite.location && (
                                          <Typography variant="body2" color="text.secondary">
                                            Location: {subsite.location}
                                          </Typography>
                                        )}
                                      </Box>

                                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                        <Typography variant="subtitle2">Teams</Typography>
                                        <EditPermission module="teams" page="management">
                                          <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                              setSelectedSiteID(site.siteID);
                                              setSelectedSubsiteID(subsite.subsiteID);
                                              setTeamDialogOpen(true);
                                            }}
                                          >
                                            Add Team
                                          </Button>
                                        </EditPermission>
                                      </Box>

                                      {subsite.teams && Object.keys(subsite.teams).length > 0 ? (
                                        <List>
                                          {Object.values(subsite.teams).map((team) => (
                                            <ListItem key={team.teamID}>
                                              <ListItemText
                                                primary={team.name}
                                                secondary={team.description || "No description"}
                                              />
                                              <ListItemSecondaryAction>
                                                <EditPermission module="teams" page="management">
                                                  <IconButton edge="end" aria-label="edit">
                                                    <EditIcon fontSize="small" />
                                                  </IconButton>
                                                </EditPermission>
                                                <EditPermission module="teams" page="management">
                                                  <IconButton edge="end" aria-label="delete">
                                                    <DeleteIcon fontSize="small" />
                                                  </IconButton>
                                                </EditPermission>
                                              </ListItemSecondaryAction>
                                            </ListItem>
                                          ))}
                                        </List>
                                      ) : (
                                        <EmptyStateCard
                                          icon={GroupIcon}
                                          title="No teams added yet"
                                          description="Add a team to this subsite to get started."
                                          cardSx={{ boxShadow: "none" }}
                                          contentSx={{ py: 2 }}
                                        />
                                      )}
                                    </AccordionDetails>
                                  </Accordion>
                                ))}
                              </List>
                            ) : (
                              <EmptyStateCard
                                icon={LocationOnIcon}
                                title="No subsites added yet"
                                description="Add your first subsite to this site to get started."
                                cardSx={{ boxShadow: "none" }}
                                contentSx={{ py: 2 }}
                              />
                            )}

                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, mb: 2 }}>
                              <Typography variant="subtitle1">Teams</Typography>
                              <EditPermission module="teams" page="management">
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => {
                                    setSelectedSiteID(site.siteID);
                                    setSelectedSubsiteID(null);
                                    setTeamDialogOpen(true);
                                  }}
                                >
                                  Add Team
                                </Button>
                              </EditPermission>
                            </Box>

                            {site.teams && Object.keys(site.teams).length > 0 ? (
                              <List>
                                {Object.values(site.teams).map((team) => (
                                  <ListItem key={team.teamID}>
                                    <ListItemText
                                      primary={team.name}
                                      secondary={team.description || "No description"}
                                    />
                                    <ListItemSecondaryAction>
                                      <EditPermission module="teams" page="management">
                                        <IconButton edge="end" aria-label="edit">
                                          <EditIcon />
                                        </IconButton>
                                      </EditPermission>
                                      <EditPermission module="teams" page="management">
                                        <IconButton edge="end" aria-label="delete">
                                          <DeleteIcon />
                                        </IconButton>
                                      </EditPermission>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <EmptyStateCard
                                icon={GroupIcon}
                                title="No teams added yet"
                                description="Add your first team to this site to get started."
                                cardSx={{ boxShadow: "none" }}
                                contentSx={{ py: 2 }}
                              />
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </List>
                  ) : (
                    <EmptyStateCard
                      icon={BusinessIcon}
                      title="No sites added yet"
                      description="Add your first site to get started."
                      cardSx={{ boxShadow: "none" }}
                      contentSx={{ py: 2 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </EditPermission>
      )}

      {activeTab === 2 && (
        <Box sx={{ mt: 3 }}>
          <Permissions />
        </Box>
      )}

      {activeTab === 3 && (
        <Box sx={{ mt: 3 }}>
          <Checklists />
        </Box>
      )}

      {activeTab === 4 && (
        <Box sx={{ mt: 3 }}>
          <MyChecklist />
        </Box>
      )}

      {/* Site Dialog */}
      <Dialog open={siteDialogOpen} onClose={() => setSiteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Site</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Site Name"
              value={newSite.name}
              onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newSite.description}
              onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
              multiline
              rows={2}
            />
            
            <Typography variant="subtitle1">Address</Typography>
            <TextField
              fullWidth
              label="Street"
              value={newSite.address.street}
              onChange={(e) => setNewSite(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={newSite.address.city}
                  onChange={(e) => setNewSite(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="State/Province"
                  value={newSite.address.state}
                  onChange={(e) => setNewSite(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Zip/Postal Code"
                  value={newSite.address.zipCode}
                  onChange={(e) => setNewSite(prev => ({ ...prev, address: { ...prev.address, zipCode: e.target.value } }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={newSite.address.country}
                  onChange={(e) => setNewSite(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSiteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSite}
            variant="contained"
            disabled={!newSite.name || loading}
          >
            Create Site
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subsite Dialog */}
      <Dialog open={subsiteDialogOpen} onClose={() => setSubsiteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Subsite</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Subsite Name"
              value={newSubsite.name}
              onChange={(e) => setNewSubsite({ ...newSubsite, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newSubsite.description}
              onChange={(e) => setNewSubsite({ ...newSubsite, description: e.target.value })}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Location"
              value={newSubsite.location}
              onChange={(e) => setNewSubsite({ ...newSubsite, location: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubsiteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSubsite}
            variant="contained"
            disabled={!newSubsite.name || loading}
          >
            Create Subsite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Team</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Team Name"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newTeam.description}
              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTeam}
            variant="contained"
            disabled={!newTeam.name || loading}
          >
            Create Team
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  </RequireCompanyContext>
  );
};

export default CompanySetup;
