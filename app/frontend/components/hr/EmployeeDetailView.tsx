"use client"

import type React from "react"
import { useState } from "react"
import {
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Alert,
  Card,
  CardContent,
} from "@mui/material"
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  AttachMoney as AttachMoneyIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material"

import type { Employee } from "../../../backend/interfaces/HRs"
import { useHR } from "../../../backend/context/HRContext"
// Company state is now handled through HRContext
import EmptyStateCard from "../reusable/EmptyStateCard"



interface EmployeeDetailViewProps {
  employee: Employee
  onEdit: () => void
  onClose: () => void
}

const EmployeeDetailView: React.FC<EmployeeDetailViewProps> = ({ employee, onEdit, onClose }) => {
  const theme = useTheme()
  const { state: hrState, generateJoinCode, getEmployeeInvites, revokeInvite } = useHR()
  // Company state is now handled through HRContext
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [showInvites, setShowInvites] = useState<boolean>(false)
  const [invites, setInvites] = useState<Array<{ code: string; data: unknown }>>([])

  const buildInviteUrl = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const basePath = '/app' // Match the basename in main.tsx
    return `${origin}${basePath}/JoinCompany?code=${encodeURIComponent(code)}`
  }

  const handleGenerateInvite = async () => {
    try {
      setError(null)
      setCopied(false)
      setLoading(true)
      // Prefer employee.roleId if present; otherwise let backend handle default
      const code = await generateJoinCode(employee.roleId || 'employee', employee.id)
      setInviteLink(buildInviteUrl(code))
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: unknown } | null)?.message === "string"
            ? String((e as { message?: unknown }).message)
            : "Failed to generate invite link"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const loadInvites = async () => {
    try {
      const employeeInvites = await getEmployeeInvites(employee.id)
      setInvites(employeeInvites || [])
    } catch (e) {
      console.error("Error loading invites:", e)
      setInvites([])
    }
  }

  const handleRevoke = async (code: string) => {
    try {
      await revokeInvite(code)
      await loadInvites()
    } catch (e) {
      console.error("Error revoking invite:", e)
      setError("Failed to revoke invite")
    }
  }

  const employeeTimeOff = (hrState.timeOffs || []).filter((entry) => entry.employeeId === employee.id)
  const employeeWarnings = (hrState.warnings || []).filter((entry) => entry.employeeId === employee.id)
  const employeeAttendance = (hrState.attendances || []).filter((entry) => entry.employeeId === employee.id)

  const latestTimeOff = [...employeeTimeOff].sort((a, b) => b.startDate - a.startDate)[0]
  const latestWarning = [...employeeWarnings].sort((a, b) => (b.issuedDate || b.createdAt || 0) - (a.issuedDate || a.createdAt || 0))[0]
  const latestAttendance = [...employeeAttendance].sort((a, b) => (b.date || b.createdAt || 0) - (a.date || a.createdAt || 0))[0]


  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return "Not specified"
    const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const capitalize = (value: string | undefined) => {
    if (!value) return "Not Specified"
    return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const getStatusColor = (status: string | undefined): "default" | "success" | "warning" | "error" => {
    if (!status) return "default"
    
    switch (status) {
      case "active":
        return "success"
      case "on_leave":
        return "warning"
      case "terminated":
        return "error"
      case "inactive":
        return "default"
      default:
        return "default"
    }
  }

  // No loading UI — render and let data fill in.

  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            borderRadius: 1
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Employee Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Avatar
          src={employee.photo || undefined}
          sx={{
            width: 80,
            height: 80,
            mr: 2,
            bgcolor: theme.palette.primary.main,
            border: `2px solid ${theme.palette.primary.light}`,
          }}
        >
          {employee.firstName?.charAt(0)}
          {employee.lastName?.charAt(0)}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography 
            variant="h5" 
            sx={{ 
                          fontWeight: 'medium' 
            }}
          >
            {employee.firstName} {employee.middleName ? `${employee.middleName} ` : ""}
            {employee.lastName}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{}}
          >
            {employee.position || employee.jobTitle || "No Position"} • {employee.department || "No Department"}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={employee.status === "on_leave" ? "On Leave" : capitalize(employee.status)}
              size="small"
              color={getStatusColor(employee.status)}
              sx={{ 
                mr: 1, 
                            borderRadius: 1 
              }}
            />
            {employee.role && (
              <Chip
                label={typeof employee.role === "object" ? employee.role.label : employee.role}
                size="small"
                variant="outlined"
                sx={{ 
                              borderRadius: 1 
                }}
              />
            )}
          </Box>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<EditIcon />} 
            onClick={onEdit} 
            sx={{ 
              mr: 1,
                          borderRadius: 1 
            }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<LinkIcon />}
            onClick={handleGenerateInvite}
            disabled={loading} // Company state handled internally
            sx={{ mr: 1, borderRadius: 1 }}
          >
            Invite Link
          </Button>
          <Button
            variant="outlined"
            onClick={async () => { setShowInvites((v) => !v); if (!showInvites) { await loadInvites() } }}
            sx={{ mr: 1, borderRadius: 1 }}
          >
            {showInvites ? 'Hide Invites' : 'View Invites'}
          </Button>
          {inviteLink && (
            <Button
              variant="outlined"
              color={copied ? 'success' : 'primary'}
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              sx={{ mr: 1, borderRadius: 1 }}
            >
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<CloseIcon />} 
            onClick={onClose}
            sx={{ 
                          borderRadius: 1 
            }}
          >
            Close
          </Button>
        </Box>
      </Box>

      {/* Personal Info Display */}
      <Grid container spacing={3}>
        {showInvites && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 1, boxShadow: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Active Invites</Typography>
                {invites.length === 0 ? (
                  <EmptyStateCard
                    icon={LinkIcon}
                    title="No invites found"
                    description="Generate an invite to link a user account to this employee."
                    cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                    contentSx={{ py: 2 }}
                  />
                ) : (
                  <List dense>
                    {invites.map(({ code, data }) => (
                      <ListItem key={code} secondaryAction={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" onClick={async () => { setInviteLink(buildInviteUrl(code)); await handleCopy() }}>Copy</Button>
                          {!data.used && !data.revoked && (
                            <Button size="small" color="error" onClick={() => handleRevoke(code)}>Revoke</Button>
                          )}
                        </Box>
                      }>
                        <ListItemText
                          primary={code}
                          secondary={`Expires: ${new Date(data.expiresAt).toLocaleString()}  ${data.used ? '(used)' : data.revoked ? '(revoked)' : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
        {inviteLink && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ borderRadius: 1 }}>
              Share this link to link a signed-in user to this employee: {inviteLink}
            </Alert>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                href={`mailto:?subject=${encodeURIComponent('Company invite')}&body=${encodeURIComponent('Join our company as this employee:\n' + inviteLink)}`}
              >
                Email
              </Button>
              <Button
                variant="outlined"
                size="small"
                href={`https://wa.me/?text=${encodeURIComponent('Join our company:\n' + inviteLink)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </Button>
              <Button
                variant="outlined"
                size="small"
                href={`sms:?&body=${encodeURIComponent('Join our company: ' + inviteLink)}`}
              >
                SMS
              </Button>
            </Box>
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 1,
            boxShadow: 1
          }}>
            <CardContent>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                              fontWeight: 'medium',
                  color: theme.palette.text.primary
                }}
              >
                Personal Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Full Name</Typography>}
                    secondary={<Typography variant="body2">
                      {`${employee.firstName} ${employee.middleName || ""} ${employee.lastName}`}
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Gender</Typography>}
                    secondary={<Typography variant="body2">
                      {employee.gender ? capitalize(employee.gender) : "Not specified"}
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Email</Typography>}
                    secondary={<Typography variant="body2">
                      {employee.email}
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Phone</Typography>}
                    secondary={<Typography variant="body2">
                      {employee.phone || "Not provided"}
                    </Typography>}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 1,
            boxShadow: 1
          }}>
            <CardContent>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                              fontWeight: 'medium',
                  color: theme.palette.text.primary
                }}
              >
                Employment Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <WorkIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Department</Typography>}
                    secondary={<Typography variant="body2">
                      {employee.department || "Not assigned"}
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Employment Type</Typography>}
                    secondary={<Typography variant="body2">
                      {employee.employmentType || "Not specified"}
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AttachMoneyIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Compensation</Typography>}
                    secondary={<Typography variant="body2">
                      {employee.payType === "salary"
                        ? `£${employee.salary?.toLocaleString() || "Not specified"} (Salary)`
                        : employee.payType === "hourly"
                          ? `£${employee.hourlyRate || "Not specified"}/hr (Hourly)`
                          : "Not specified"}
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EventIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography>Hire Date</Typography>}
                    secondary={<Typography variant="body2">
                      {formatDate(employee.hireDate)}
                    </Typography>}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee records summary */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Employee Records
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Holidays</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {employeeTimeOff.length} record{employeeTimeOff.length === 1 ? "" : "s"}.
                    {latestTimeOff ? ` Latest: ${capitalize(latestTimeOff.status)} ${capitalize(latestTimeOff.type)} from ${formatDate(latestTimeOff.startDate)}.` : " No holiday records yet."}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Warnings</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {employeeWarnings.length} warning{employeeWarnings.length === 1 ? "" : "s"}.
                    {latestWarning ? ` Latest: ${capitalize(latestWarning.type)} warning issued ${formatDate(latestWarning.issuedDate || latestWarning.createdAt)}.` : " No warnings recorded."}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Attendance</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {employeeAttendance.length} attendance record{employeeAttendance.length === 1 ? "" : "s"}.
                    {latestAttendance ? ` Latest: ${capitalize(latestAttendance.status)} on ${formatDate(latestAttendance.date || latestAttendance.createdAt)}.` : " No attendance logged yet."}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default EmployeeDetailView
