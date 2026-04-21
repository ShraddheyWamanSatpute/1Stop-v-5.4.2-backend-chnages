"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useCompany, CompanySetup } from "../../../backend/context/CompanyContext"
import { uploadFile } from "../../../backend/services/Firebase"

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
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import EditIcon from "@mui/icons-material/Edit"
import RequireCompanyContext from "../../components/global/RequireCompanyContext"
import { themeConfig } from "../../../theme/AppTheme"

const BUSINESS_TYPES = ["Corporation", "LLC", "Partnership", "Sole Proprietorship", "Non-Profit", "Other"] as const
type CompanyType = "hospitality" | "supplier" | "other"

const normalizeCompanyType = (raw: unknown): CompanyType => {
  if (typeof raw !== "string") return "hospitality"
  const v = raw.trim().toLowerCase()
  if (v === "supplier") return "supplier"
  if (v === "other") return "other"
  return "hospitality"
}

const normalizeBusinessType = (raw: unknown): string => {
  if (typeof raw !== "string") return ""
  const v = raw.trim()
  if (!v) return ""
  // Legacy bug: some installations stored companyType (hospitality/supplier/other) into business.businessType
  const lower = v.toLowerCase()
  if (lower === "hospitality" || lower === "supplier" || lower === "other") return ""
  return v
}

// Create a simple permission wrapper component
interface EditPermissionProps {
  module: string
  page: string
  children: React.ReactNode
}

// Permission wrapper component that checks permissions from CompanyContext
const EditPermission: React.FC<EditPermissionProps> = ({ module, page, children }) => {
  const { hasPermission } = useCompany()

  // Check if user has edit permission for the specified module and page
  const canEdit = hasPermission(module, page, "edit")

  // Always render children but apply disabled state if no permission
  // This prevents controlled/uncontrolled input warnings from unmounting/remounting
  if (!canEdit) {
    // Create a disabled version of all children by cloning them with disabled prop
    const disabledChildren = React.Children.map(children, child => {
      // Only apply to React elements
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { 
          disabled: true,
          style: { opacity: 0.6, pointerEvents: 'none' },
          ...child.props
        })
      }
      return child
    })
    return <>{disabledChildren}</>
  }
  
  return <>{children}</>
}

const CompanyInfo: React.FC = () => {
  // Form validation
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  const { state, fetchCompanySetup, saveCompanySetup, updateCompanyLogo } = useCompany()
  const companyID = state.companyID

  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  // Additional company info fields
  const [description, setDescription] = useState("")
  const [originalSetup, setOriginalSetup] = useState<CompanySetup>({
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
      },
    },
    branding: {
      logo: "",
      primaryColor: themeConfig.brandColors.navy,
      secondaryColor: themeConfig.brandColors.offWhite,
    },
    createdAt: Date.now(),
  })

  // (moved below companySetup to avoid TDZ)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  })

  // Initialize with empty strings for all text fields to ensure they're always controlled
  const [companySetup, setCompanySetup] = useState<CompanySetup>({
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
      },
    },
    branding: {
      logo: "",
      primaryColor: themeConfig.brandColors.navy,
      secondaryColor: themeConfig.brandColors.offWhite,
    },
    createdAt: Date.now(),
  })

  // Keep a clean snapshot for cancel when not editing
  useEffect(() => {
    if (!isEditing) {
      setOriginalSetup(companySetup)
    }
  }, [companySetup, isEditing])

  // Dirty tracking for unsaved-changes behavior
  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(companySetup) !== JSON.stringify(originalSetup)
    } catch {
      return true
    }
  }, [companySetup, originalSetup])

  // Warn before unload if there are unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing && isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isEditing, isDirty])

  useEffect(() => {
    if (companyID) {
      setLoading(true)
      fetchCompanySetup()
        .then((data) => {
          if (data) {
            // Create a deep copy of the current state to ensure we don't lose any values
            const currentState = JSON.parse(JSON.stringify(companySetup));
            
            // Ensure all nested objects exist before setting state
            const safeData = {
              ...currentState,
              ...data,
              // Always ensure these objects exist with default values
              address: {
                street: "",
                city: "",
                state: "",
                zipCode: "",
                country: "",
                // Spread current values first, then data values to ensure we keep any existing values
                ...(currentState.address || {}),
                ...(data.address || {})
              },
              contact: {
                email: "",
                phone: "",
                website: "",
                ...(currentState.contact || {}),
                ...(data.contact || {})
              },
              business: {
                taxId: "",
                registrationNumber: "",
                industry: "",
                businessType: "",
                ...(currentState.business || {}),
                ...(data.business || {})
              },
              branding: {
                logo: "",
                primaryColor: themeConfig.brandColors.navy,
                secondaryColor: themeConfig.brandColors.offWhite,
                ...(currentState.branding || {}),
                ...(data.branding || {})
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
                  ...(currentState.settings?.workingHours || {}),
                  ...(data.settings?.workingHours || {})
                },
                ...(currentState.settings || {}),
                ...(data.settings || {})
              }
            }
            // Normalize fields that must match UI constraints
            const normalizedCompanyType = normalizeCompanyType((data as any)?.companyType ?? (data as any)?.business?.businessType)
            ;(safeData as any).companyType = normalizedCompanyType
            ;(safeData as any).business = {
              ...(safeData as any).business,
              businessType: normalizeBusinessType((safeData as any).business?.businessType),
            }
            setCompanySetup(safeData)
            
            // Set additional fields if they exist in the data
            if ('description' in data) setDescription(data.description as string)
          }
        })
        .catch((error) => {
          console.error("Error fetching company setup:", error)
          setSnackbar({
            open: true,
            message: "Failed to load company information",
            severity: "error",
          })
        })
        .finally(() => {
          setLoading(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyID])

  // Initialize with company data from context if available
  useEffect(() => {
    if (state.company && !companySetup.name) {
      const company = state.company;
      setCompanySetup((prev) => {
        // Make sure all nested objects are initialized
        const prevBranding = prev.branding || {
          logo: "",
          primaryColor: themeConfig.brandColors.navy,
          secondaryColor: themeConfig.brandColors.offWhite,
        };
        
        const prevContact = prev.contact || {
          email: "",
          phone: "",
          website: "",
        };
        
        const prevAddress = prev.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        };
        
        const prevBusiness = prev.business || {
          taxId: "",
          registrationNumber: "",
          industry: "",
          businessType: "",
        };
        
        return {
          ...prev,
          id: company.companyID,
          name: company.companyName || "",
          companyType: normalizeCompanyType(company.companyType),
          branding: {
            ...prevBranding,
            logo: company.companyLogo || "",
          },
          contact: {
            ...prevContact,
            email: company.companyEmail || "",
            phone: company.companyPhone || "",
            website: company.companyWebsite || "",
          },
          address: {
            ...prevAddress,
            street: company.companyAddress || "",
          },
          business: {
            ...prevBusiness,
            industry: company.companyIndustry || "",
            businessType: normalizeBusinessType(prevBusiness.businessType),
          },
        };
      });
    }
  }, [state.company, companySetup.name])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>,
    section?: "address" | "contact" | "business" | "branding" | "settings",
  ) => {
    const { name, value } = e.target

    if (section) {
      setCompanySetup((prev) => {
        // Create default empty objects for each section type if they don't exist
        let sectionData;
        
        switch(section) {
          case 'address':
            sectionData = prev.address || {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: "",
            };
            break;
          case 'contact':
            sectionData = prev.contact || {
              email: "",
              phone: "",
              website: "",
            };
            break;
          case 'business':
            sectionData = prev.business || {
              taxId: "",
              registrationNumber: "",
              industry: "",
              businessType: "",
            };
            break;
          case 'branding':
            sectionData = prev.branding || {
              logo: "",
              primaryColor: themeConfig.brandColors.navy,
              secondaryColor: themeConfig.brandColors.offWhite,
            };
            break;
          case 'settings':
            sectionData = prev.settings || {
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
              },
            };
            break;
          default:
            sectionData = {};
        }
        
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [name]: value,
          },
        }
      })
    } else {
      setCompanySetup((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSnackbar({
        open: true,
        message: "Please select an image file",
        severity: "error",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "File size must be less than 5MB",
        severity: "error",
      })
      return
    }

    setUploadingLogo(true)
    try {
      const logoUrl = await uploadFile(file)

      // Update both local state and company context
      setCompanySetup((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          logo: logoUrl,
        },
      }))

      // Update company logo in context
      await updateCompanyLogo(logoUrl)

      setSnackbar({
        open: true,
        message: "Logo uploaded successfully",
        severity: "success",
      })
    } catch (error) {
      console.error("Error uploading logo:", error)
      setSnackbar({
        open: true,
        message: "Failed to upload logo",
        severity: "error",
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {};
    
    if (!companySetup.name.trim()) {
      newErrors.name = "Company name is required";
    }
    
    if (companySetup.contact?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(companySetup.contact.email)) {
        newErrors.email = "Invalid email format";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!companyID) return;
    
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: "Please fix the errors before saving",
        severity: "error"
      });
      return;
    }

    setSaving(true)
    try {
      // Create a combined object with both the CompanySetup fields and additional fields
      const combinedData = {
        ...companySetup,
        description: description
      }
      
      await saveCompanySetup(combinedData)
      setSnackbar({
        open: true,
        message: "Company information saved successfully",
        severity: "success",
      })
      setIsEditing(false)
      setOriginalSetup(companySetup)
    } catch (error) {
      console.error("Error saving company setup:", error)
      setSnackbar({
        open: true,
        message: "Failed to save company information",
        severity: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  return (
    <RequireCompanyContext>
    <Box sx={{ p: 0 }}>
      <Card>
        <CardContent sx={{ px: 3, pb: 3, pt: 0 }}>
          <EditPermission module="company" page="setup">
            {/* Basic Information */}
            <Typography variant="h6" sx={{ mb: 2, fontSize: "1.1rem", fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs="auto">
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="logo-upload"
                  type="file"
                  onChange={handleLogoUpload}
                  disabled={!isEditing || uploadingLogo}
                />
                <label htmlFor="logo-upload" style={{ cursor: isEditing && !uploadingLogo ? "pointer" : "default" }}>
                  <Avatar 
                    src={companySetup.branding?.logo || ""} 
                    sx={{ 
                      width: 48, 
                      height: 48,
                      opacity: uploadingLogo ? 0.6 : 1,
                      transition: "opacity 0.2s",
                      "&:hover": isEditing && !uploadingLogo ? {
                        opacity: 0.8
                      } : {}
                    }}
                  >
                    {uploadingLogo ? "..." : (companySetup.name || "").charAt(0).toUpperCase()}
                  </Avatar>
                </label>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="name"
                  value={companySetup.name}
                  onChange={handleChange}
                  size="small"
                  disabled={!isEditing}
                  required
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Legal Name"
                  name="legalName"
                  value={companySetup.legalName}
                  onChange={handleChange}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs="auto" sx={{ ml: "auto" }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {isEditing && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setCompanySetup(originalSetup)
                        setIsEditing(false)
                        setErrors({})
                      }}
                      size="small"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant={isEditing ? "contained" : "outlined"}
                    color="primary"
                    startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
                    onClick={() => {
                      if (!isEditing) {
                        setIsEditing(true)
                      } else {
                        void handleSave()
                      }
                    }}
                    disabled={saving && isEditing}
                    size="small"
                  >
                    {isEditing ? "Save Changes" : "Edit"}
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Business Information */}
            <Typography variant="h6" sx={{ mb: 2, fontSize: "1.1rem", fontWeight: 600 }}>
              Business Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Industry"
                  name="industry"
                  variant="outlined"
                  size="small"
                  value={companySetup.business?.industry ?? ""}
                  onChange={(e) => handleChange(e, "business")}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" disabled={!isEditing}>
                  <InputLabel>Company Type</InputLabel>
                  <Select
                    label="Company Type"
                    name="companyType"
                    value={companySetup.companyType ?? "hospitality"}
                    onChange={(e) => handleChange(e as SelectChangeEvent<string>)}
                  >
                    <MenuItem value="hospitality">Hospitality</MenuItem>
                    <MenuItem value="supplier">Supplier</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" disabled={!isEditing}>
                  <InputLabel>Business Type</InputLabel>
                  <Select
                    label="Business Type"
                    name="businessType"
                    value={companySetup.business?.businessType ?? ""}
                    onChange={(e) => {
                      const syntheticEvent = {
                        ...e,
                        target: { name: "businessType", value: e.target.value }
                      } as React.ChangeEvent<HTMLInputElement>
                      handleChange(syntheticEvent, "business")
                    }}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tax ID"
                  name="taxId"
                  value={companySetup.business?.taxId ?? ""}
                  onChange={(e) => handleChange(e, "business")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Registration Number"
                  name="registrationNumber"
                  value={companySetup.business?.registrationNumber ?? ""}
                  onChange={(e) => handleChange(e, "business")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={2}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Address Information */}
            <Typography variant="h6" sx={{ mb: 2, fontSize: "1.1rem", fontWeight: 600 }}>
              Address
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="street"
                  value={companySetup.address?.street ?? ""}
                  onChange={(e) => handleChange(e, "address")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={companySetup.address?.city ?? ""}
                  onChange={(e) => handleChange(e, "address")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State/Province"
                  name="state"
                  value={companySetup.address?.state ?? ""}
                  onChange={(e) => handleChange(e, "address")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Postal/Zip Code"
                  name="zipCode"
                  value={companySetup.address?.zipCode ?? ""}
                  onChange={(e) => handleChange(e, "address")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="country"
                  value={companySetup.address?.country ?? ""}
                  onChange={(e) => handleChange(e, "address")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Contact Information */}
            <Typography variant="h6" sx={{ mb: 2, fontSize: "1.1rem", fontWeight: 600 }}>
              Contact
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={companySetup.contact?.email ?? ""}
                  onChange={(e) => handleChange(e, "contact")}
                  size="small"
                  required
                  error={Boolean(errors.email)}
                  helperText={errors.email}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={companySetup.contact?.phone ?? ""}
                  onChange={(e) => handleChange(e, "contact")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Website"
                  name="website"
                  value={companySetup.contact?.website ?? ""}
                  onChange={(e) => handleChange(e, "contact")}
                  size="small"
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>

            {/* Actions moved to header toolbar for consistent styling */}
          </EditPermission>
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
    </RequireCompanyContext>
  )
}

export default CompanyInfo
