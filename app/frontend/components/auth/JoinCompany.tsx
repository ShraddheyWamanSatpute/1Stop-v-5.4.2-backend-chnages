"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Grid
} from "@mui/material"
import {
  Business as BusinessIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon
} from "@mui/icons-material"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { themeConfig } from "../../../theme/AppTheme"
import { isMobilePhone } from "../../../utils/deviceDetection"

type InviteData = {
  code: string
  type: "employee" | "company" | "site"
  companyID?: string
  companyName?: string
  siteId?: string
  siteName?: string
  role?: string
  expiresAt?: number
}

const JoinCompany: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state: settingsState, login, register, updatePersonal } = useSettings()
  const {
    acceptSiteInvite,
    getSiteInviteByCode,
    getEmployeeJoinCodeByCode,
    acceptEmployeeInvite,
    getCompanyInviteByCode,
    acceptCompanyInvite,
  } = useCompany()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  })
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)

  const postAcceptPath = () => (isMobilePhone() ? "/Mobile/Dashboard" : "/Company")

  const getErrorMessage = (e: unknown, fallback: string) => {
    if (e instanceof Error) return e.message || fallback
    const msg = (e as { message?: unknown } | null | undefined)?.message
    return typeof msg === "string" && msg.trim() ? msg : fallback
  }

  const inviteCode = searchParams.get("code")

  useEffect(() => {
    const loadInviteData = async () => {
      if (!inviteCode) {
        setError("Invalid invite link - missing code")
        setLoading(false)
        return
      }

      try {
        // First try to get employee invite
        const employeeInvite = await getEmployeeJoinCodeByCode(inviteCode)
        
        if (employeeInvite) {
          // Check if employee invite is expired
          if (employeeInvite.expiresAt && Date.now() > employeeInvite.expiresAt) {
            setError("This invite link has expired")
            setLoading(false)
            return
          }
          
          // Check if already used
          if (employeeInvite.used) {
            setError("This invite link has already been used")
            setLoading(false)
            return
          }
          
          // Check if revoked
          if (employeeInvite.revoked) {
            setError("This invite link has been revoked")
            setLoading(false)
            return
          }
          
          // Fetch company and site names in parallel for faster loading
          const { db, ref, get } = await import("../../../backend/services/Firebase")
          let companyName = ''
          let siteName = ''
          let roleName = employeeInvite.roleId || 'staff'
          
          try {
            // Fetch company and site in parallel (much faster)
            const [companySnapshot, siteSnapshot] = await Promise.all([
              get(ref(db, `companies/${employeeInvite.companyId}`)),
              get(ref(db, `companies/${employeeInvite.companyId}/sites/${employeeInvite.siteId}`))
            ])
            
            if (companySnapshot.exists()) {
              companyName = companySnapshot.val().companyName || ''
            }
            
            if (siteSnapshot.exists()) {
              siteName = siteSnapshot.val().name || ''
            }
            
            // Get role name if roleId exists (non-blocking - fetch in parallel, use first found)
            if (employeeInvite.roleId) {
              const paths: string[] = []
              if (employeeInvite.subsiteId) {
                paths.push(`companies/${employeeInvite.companyId}/sites/${employeeInvite.siteId}/subsites/${employeeInvite.subsiteId}/data/hr`)
              }
              paths.push(`companies/${employeeInvite.companyId}/sites/${employeeInvite.siteId}/data/hr`)
              paths.push(`companies/${employeeInvite.companyId}/data/hr`)

              // Try to get role in parallel from all paths, use first successful result
              const rolePromises = paths.map(p => get(ref(db, `${p}/roles/${employeeInvite.roleId}`)).catch(() => null))
              const roleResults = await Promise.all(rolePromises)
              const foundRole = roleResults.find(snap => snap && snap.exists())
              
              if (foundRole) {
                roleName = foundRole.val().label || foundRole.val().name || employeeInvite.roleId
              }
            }
          } catch (fetchError) {
            console.warn("Error fetching company/site names:", fetchError)
            // Don't block - continue with defaults
          }
          
          // Format employee invite data similar to site invite for compatibility
          setInviteData({
            code: inviteCode,
            type: 'employee',
            companyID: employeeInvite.companyId,
            siteId: employeeInvite.siteId,
            expiresAt: employeeInvite.expiresAt,
            companyName: companyName,
            siteName: siteName,
            role: roleName
          })
          setLoading(false)
          return
        }

        // If not employee invite, try company invite (owner/admin invite)
        const companyInvite = await getCompanyInviteByCode(inviteCode)
        if (companyInvite) {
          if (companyInvite.expiresAt && Date.now() > companyInvite.expiresAt) {
            setError("This invite link has expired")
            setLoading(false)
            return
          }
          if (companyInvite.status && companyInvite.status !== "pending") {
            setError("This invite link has already been used")
            setLoading(false)
            return
          }
          if (companyInvite.revoked) {
            setError("This invite link has been revoked")
            setLoading(false)
            return
          }

          setInviteData({
            code: inviteCode,
            type: "company",
            companyID: companyInvite.companyID,
            companyName: companyInvite.companyName || "",
            role: companyInvite.role || "owner",
            expiresAt: companyInvite.expiresAt,
          })
          // Store invite email for email mismatch check
          setInviteEmail(companyInvite.email || null)
          setLoading(false)
          return
        }
        
        // If not employee invite, try site invite
        const siteInvite = await getSiteInviteByCode(inviteCode)
        if (!siteInvite) {
          setError("Invalid or expired invite link")
          setLoading(false)
          return
        }

        // Check if site invite is expired
        if (siteInvite.expiresAt && Date.now() > siteInvite.expiresAt) {
          setError("This invite link has expired")
          setLoading(false)
          return
        }

        setInviteData({ ...(siteInvite as unknown as InviteData), type: 'site' })
        setLoading(false)
      } catch (error) {
        console.error("Error loading invite:", error)
        setError("Failed to load invite information")
        setLoading(false)
      }
    }

    loadInviteData()
  }, [inviteCode, getSiteInviteByCode, getEmployeeJoinCodeByCode, getCompanyInviteByCode])

  // Handler to accept the invite when user clicks accept button
  const handleAcceptInvite = async () => {
    if (!inviteData || !settingsState.auth.uid) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Accept the invite immediately without delay
      let result
      if (inviteData.type === 'employee') {
        result = await acceptEmployeeInvite(inviteData.code, settingsState.auth.uid)
      } else if (inviteData.type === 'company') {
        result = await acceptCompanyInvite(inviteData.code, settingsState.auth.uid)
      } else {
        result = await acceptSiteInvite(inviteData.code, settingsState.auth.uid)
      }
      
      if (result.success) {
        // On mobile, go straight into the mobile portal to avoid bouncing through desktop routes.
        navigate(postAcceptPath(), { replace: true })
      } else {
        setLoading(false)
        const errorMessage = result.message || "Failed to accept invite"
        console.error("Failed to accept invite:", errorMessage)
        setError(errorMessage)
      }
    } catch (error) {
      setLoading(false)
      const errorMessage = error instanceof Error ? error.message : "Failed to accept invite"
      console.error("Error accepting invite:", error)
      setError(errorMessage)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.email) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    
    if (!formData.password) {
      errors.password = "Password is required"
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }
    
    if (isSigningUp) {
      if (!formData.firstName.trim()) {
        errors.firstName = "First name is required"
      }
      if (!formData.lastName.trim()) {
        errors.lastName = "Last name is required"
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSignIn = async () => {
    setError(null)
    setFormErrors({})
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      await login(formData.email, formData.password)
      
      if (inviteData) {
        // Accept the invite based on type
        let acceptResult
        if (inviteData.type === 'employee') {
          acceptResult = await acceptEmployeeInvite(inviteData.code, settingsState.auth.uid!)
        } else if (inviteData.type === 'company') {
          acceptResult = await acceptCompanyInvite(inviteData.code, settingsState.auth.uid!)
        } else {
          acceptResult = await acceptSiteInvite(inviteData.code, settingsState.auth.uid!)
        }
        if (acceptResult.success) {
          navigate("/Company")
        } else {
          setError(acceptResult.message || "Failed to accept invite")
        }
      } else {
        navigate("/Company")
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Sign in failed. Please check your credentials and try again."))
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError(null)
    setFormErrors({})
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      await register(formData.email, formData.password)
      
      // Update user profile with firstName and lastName
      if (settingsState.auth.uid) {
        try {
          await updatePersonal({
            firstName: formData.firstName,
            lastName: formData.lastName,
            // PersonalSettings doesn't have displayName; display name is derived elsewhere (auth/profile).
          })
        } catch (profileError) {
          console.warn("Failed to update user profile:", profileError)
          // Don't fail the entire signup if profile update fails
        }
      }
      
      if (inviteData) {
        // Accept the invite based on type
        let acceptResult
        if (inviteData.type === 'employee') {
          acceptResult = await acceptEmployeeInvite(inviteData.code, settingsState.auth.uid!)
        } else if (inviteData.type === 'company') {
          acceptResult = await acceptCompanyInvite(inviteData.code, settingsState.auth.uid!)
        } else {
          acceptResult = await acceptSiteInvite(inviteData.code, settingsState.auth.uid!)
        }
        if (acceptResult.success) {
          navigate("/Company")
        } else {
          setError(acceptResult.message || "Failed to accept invite")
        }
      } else {
        navigate("/Company")
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Sign up failed. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  // If user is already signed in and we have invite data, show confirmation screen immediately
  // (don't wait for loading to finish if we already have the data)
  if (settingsState.auth.uid && inviteData && !error) {
    return (
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        bgcolor: themeConfig.colors.background.default,
        p: 3
      }}>
        <Card sx={{ maxWidth: 500, width: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Avatar sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: themeConfig.colors.primary.main,
                mx: "auto",
                mb: 2
              }}>
                <BusinessIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Join {inviteData.companyName || "Company"}
              </Typography>
              {inviteData.siteName && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Location: {inviteData.siteName}
                </Typography>
              )}
              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                You've been invited to join as a <strong>{inviteData.role || "staff member"}</strong>
                {inviteData.siteName && ` at ${inviteData.siteName}`}.
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Signed in as: <strong>{settingsState.auth.email}</strong>
              </Typography>
              
              {/* Show email mismatch warning if invite has specific email */}
              {inviteEmail && settingsState.auth.email && 
               inviteEmail.toLowerCase().trim() !== settingsState.auth.email.toLowerCase().trim() && (
                <Alert severity="warning" sx={{ mb: 2, textAlign: "left" }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Email Mismatch
                  </Typography>
                  <Typography variant="body2">
                    This invitation was sent to <strong>{inviteEmail}</strong>, but you're signed in as <strong>{settingsState.auth.email}</strong>.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    You may need to sign in with the correct email address to accept this invitation.
                  </Typography>
                </Alert>
              )}
              
              {loading ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary">
                    Accepting invitation...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Would you like to accept this invitation?
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    <Button
                      variant="contained"
                      onClick={handleAcceptInvite}
                      disabled={loading}
                      size="large"
                      sx={{ minWidth: 120 }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/Company")}
                      disabled={loading}
                      size="large"
                      sx={{ minWidth: 120 }}
                    >
                      Decline
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Show loading screen only if we don't have invite data yet
  if (loading && !inviteData) {
    return (
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        bgcolor: themeConfig.colors.background.default,
        gap: 3
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Loading invite information...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, textAlign: "center" }}>
          Please wait while we verify your invitation
        </Typography>
      </Box>
    )
  }

  if (error && !inviteData) {
    return (
      <Box sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        bgcolor: themeConfig.colors.background.default,
        p: 3
      }}>
        <Card sx={{ maxWidth: 400, width: "100%" }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button 
              variant="contained" 
              onClick={() => navigate("/Login")}
              fullWidth
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh",
      bgcolor: themeConfig.colors.background.default,
      p: 3
    }}>
      <Card sx={{ maxWidth: 500, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Avatar sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: themeConfig.colors.primary.main,
              mx: "auto",
              mb: 2
            }}>
              <BusinessIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Join {inviteData?.companyName || "Company"}
            </Typography>
            {inviteData?.siteName && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Location: {inviteData.siteName}
              </Typography>
            )}
            <Typography variant="body1" color="textSecondary">
              You've been invited to join as a <strong>{inviteData?.role || "staff member"}</strong>
              {inviteData?.siteName && ` at ${inviteData.siteName}`}.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Button
              variant={isSigningUp ? "outlined" : "contained"}
              onClick={() => {
                setIsSigningUp(false)
                setError(null)
                setFormErrors({})
              }}
              fullWidth
              sx={{ mb: 1 }}
            >
              Sign In to Existing Account
            </Button>
            <Button
              variant={isSigningUp ? "contained" : "outlined"}
              onClick={() => {
                setIsSigningUp(true)
                setError(null)
                setFormErrors({})
              }}
              fullWidth
            >
              Create New Account
            </Button>
          </Box>

          {!isSigningUp ? (
            // Sign In Form
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (formErrors.email) setFormErrors({ ...formErrors, email: "" })
                }}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  if (formErrors.password) setFormErrors({ ...formErrors, password: "" })
                }}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleSignIn}
                disabled={loading}
                fullWidth
                size="large"
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : "Sign In & Join Company"}
              </Button>
            </Box>
          ) : (
            // Sign Up Form
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value })
                      if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: "" })
                    }}
                    error={!!formErrors.firstName}
                    helperText={formErrors.firstName}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value })
                      if (formErrors.lastName) setFormErrors({ ...formErrors, lastName: "" })
                    }}
                    error={!!formErrors.lastName}
                    helperText={formErrors.lastName}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (formErrors.email) setFormErrors({ ...formErrors, email: "" })
                }}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  if (formErrors.password) setFormErrors({ ...formErrors, password: "" })
                }}
                error={!!formErrors.password}
                helperText={formErrors.password || "Must be at least 6 characters"}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleSignUp}
                disabled={loading}
                fullWidth
                size="large"
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : "Create Account & Join Company"}
              </Button>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              variant="text"
              onClick={() => navigate("/Login")}
              size="small"
            >
              Already have an account? Sign in
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default JoinCompany
