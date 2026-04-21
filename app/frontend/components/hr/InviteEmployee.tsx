"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useHR } from "../../../backend/context/HRContext"
import { Box, Button, Card, CardContent, CardHeader, Chip, FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Snackbar, TextField, Tooltip, Alert } from "@mui/material"
import { ContentCopy as CopyIcon, Email as EmailIcon, WhatsApp as WhatsAppIcon, Send as SendIcon } from "@mui/icons-material"
// Company state is now handled through HRContext

const InviteEmployee: React.FC = () => {
  const { generateJoinCode, getEmployeeInvites, revokeInvite, state: hrState } = useHR()
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [roleId, setRoleId] = useState("")
  const [link, setLink] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const canInvite = useMemo(() => Boolean(hrState.companyID && (hrState.selectedSiteID || (hrState.sites && hrState.sites.length > 0))), [hrState.companyID, hrState.selectedSiteID, hrState.sites])

  const makeLink = (code: string) => {
    const origin = window.location.origin
    const basePath = '/app' // Match the basename in main.tsx
    return `${origin}${basePath}/JoinCompany?code=${encodeURIComponent(code)}`
  }

  const handleGenerate = async () => {
    try {
      if (!employeeId) {
        setError("Select an employee to invite")
        return
      }

      const employee = hrState.employees?.find((e) => e.id === employeeId)
      const effectiveRoleId = roleId || employee?.roleId || "employee"
      setIsGenerating(true)
      const code = await generateJoinCode(effectiveRoleId, employeeId)
      setLink(makeLink(code))
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: unknown } | null)?.message === "string"
            ? String((e as { message?: unknown }).message)
            : "Failed to generate invite"
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleResendRelink = async () => {
    try {
      if (!employeeId) {
        setError("Select an employee to invite")
        return
      }
      setIsGenerating(true)

      // Revoke previous invites for this employee (keeps system traceable and prevents multiple valid links).
      try {
        const existing = await getEmployeeInvites(employeeId)
        const codes = Array.isArray(existing)
          ? existing.map((x: any) => x?.code).filter(Boolean)
          : []
        await Promise.all(codes.map((c: string) => revokeInvite(c).catch(() => {})))
      } catch {
        // Ignore revoke errors; still generate a fresh code.
      }

      const employee = hrState.employees?.find((e) => e.id === employeeId)
      const effectiveRoleId = roleId || employee?.roleId || "employee"
      const code = await generateJoinCode(effectiveRoleId, employeeId)
      setLink(makeLink(code))
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: unknown } | null)?.message === "string"
            ? String((e as { message?: unknown }).message)
            : "Failed to resend invite"
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  const sendEmail = () => {
    if (!link || !email) return
    const subject = encodeURIComponent(`You're invited to join ${hrState.companyName || "our company"}`)
    const body = encodeURIComponent(`Please click the link to join: ${link}`)
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank")
  }

  const sendWhatsApp = () => {
    if (!link || !phone) return
    const text = encodeURIComponent(`Please click the link to join: ${link}`)
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, "_blank")
  }

  return (
    <Card>
      <CardHeader title="Invite Employee" />
      <CardContent>
        {!canInvite && <Alert severity="warning" sx={{ mb: 2 }}>Select a company and site before inviting employees.</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                label="Employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select employee</em>
                </MenuItem>
                {(hrState.employees || []).map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Role (optional)</InputLabel>
              <Select
                label="Role (optional)"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Use employee's role</em>
                </MenuItem>
                {(hrState.roles || []).map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.label || r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleGenerate}
                disabled={!canInvite || !employeeId || isGenerating}
              >
                Generate Invite Link
              </Button>
              <Button
                variant="outlined"
                onClick={handleResendRelink}
                disabled={!canInvite || !employeeId || isGenerating}
              >
                Resend / Re-link Invite
              </Button>
              {link && <Chip label="Link ready" color="success" size="small" />}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Invite Link" value={link} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="WhatsApp / Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Copy link">
                <span>
                  <IconButton onClick={copy} disabled={!link}><CopyIcon /></IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Send email">
                <span>
                  <IconButton onClick={sendEmail} disabled={!link || !email}><EmailIcon /></IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Send WhatsApp">
                <span>
                  <IconButton onClick={sendWhatsApp} disabled={!link || !phone}><WhatsAppIcon /></IconButton>
                </span>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        <Snackbar open={copied} autoHideDuration={1500} onClose={() => setCopied(false)} message="Copied!" />
        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)} message={error || ''} />
      </CardContent>
    </Card>
  )
}

export default InviteEmployee


