import React, { useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Checkbox,
} from "@mui/material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { db, get, push, ref, set } from "../../../backend/services/Firebase"
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys"

type CompanyType = "hospitality" | "supplier" | "other"

export default function AdminCreateCompany() {
  const { state: companyState, createCompany, setCompanyID, createCompanyInvite } = useCompany()
  const { state: settingsState } = useSettings()

  const [step, setStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [savingContract, setSavingContract] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [sendingInviteEmail, setSendingInviteEmail] = useState(false)
  const [inviteEmailStatus, setInviteEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const [createdCompanyId, setCreatedCompanyId] = useState<string>("")
  const [createdCompanyName, setCreatedCompanyName] = useState<string>("")
  const [createdContractId, setCreatedContractId] = useState<string>("")
  const [ownerInviteLink, setOwnerInviteLink] = useState<string>("")

  const [companyForm, setCompanyForm] = useState({
    name: "",
    legalName: "",
    companyType: "hospitality" as CompanyType,
    email: "",
    phone: "",
    website: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    industry: "",
    createDefaultSite: true,
  })

  const [contractForm, setContractForm] = useState({
    templateId: "custom",
    contractNumber: "",
    status: "active" as "draft" | "active" | "expired" | "terminated",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
  })

  const [inviteForm, setInviteForm] = useState({
    ownerEmail: "",
    expiresInDays: 14,
    role: "owner",
    department: "Management",
  })

  const steps = useMemo(() => ["Company details", "Contract", "Invite owner"], [])

  const handleCreateCompany = async () => {
    if (!settingsState.auth?.uid) return
    if (!companyForm.name.trim()) return

    setCreating(true)
    try {
      const companyID = await createCompany({
        name: companyForm.name.trim(),
        legalName: (companyForm.legalName || companyForm.name).trim(),
        companyType: companyForm.companyType,
        description: "",
        address: {
          street: companyForm.street,
          city: companyForm.city,
          state: companyForm.state,
          zipCode: companyForm.zipCode,
          country: companyForm.country,
        },
        contact: {
          email: companyForm.email,
          phone: companyForm.phone,
          website: companyForm.website,
        },
        business: {
          taxId: "",
          registrationNumber: "",
          industry: companyForm.industry,
          businessType: "",
        },
        createDefaultSite: companyForm.createDefaultSite,
      })

      setCreatedCompanyId(companyID)
      setCreatedCompanyName(companyForm.name.trim())

      try {
        setCompanyID(companyID)
      } catch {
        // ignore
      }

      setStep(1)
    } finally {
      setCreating(false)
    }
  }

  const ensureCustomTemplate = async (companyId: string) => {
    const tplRef = ref(db, `companies/${companyId}/contractTemplates/custom`)
    const snap = await get(tplRef)
    if (snap.exists()) return
    const uid = settingsState.auth?.uid || ""
    await set(tplRef, {
      id: "custom",
      name: "Custom",
      description: "Custom contract template (created by admin setup).",
      templateContent:
        "Contract for {{companyName}}\\n\\nStart Date: {{startDate}}\\nEnd Date: {{endDate}}\\n\\nTerms:\\n{{terms}}",
      variables: [],
      isDefault: true,
      createdAt: Date.now(),
      createdBy: uid,
    })
  }

  const handleSaveContract = async () => {
    const companyId = createdCompanyId || companyState.companyID
    if (!companyId) return

    setSavingContract(true)
    try {
      await ensureCustomTemplate(companyId)

      const uid = settingsState.auth?.uid || ""
      const contractsRef = ref(db, `companies/${companyId}/contracts`)
      const newRef = push(contractsRef)
      const id = newRef.key!
      const startDate = new Date(contractForm.startDate).getTime()
      const endDate = contractForm.endDate ? new Date(contractForm.endDate).getTime() : undefined

      const contractNumber = (contractForm.contractNumber || `C-${Date.now()}`).trim()

      await set(newRef, {
        id,
        companyId,
        templateId: (contractForm.templateId || "custom").trim(),
        contractNumber,
        status: contractForm.status,
        startDate,
        endDate,
        terms: {
          notes: contractForm.notes || "",
        },
        createdAt: Date.now(),
        createdBy: uid,
      })

      setCreatedContractId(id)
      setStep(2)
    } finally {
      setSavingContract(false)
    }
  }

  const handleCreateOwnerInvite = async () => {
    const companyId = createdCompanyId || companyState.companyID
    if (!companyId) return
    if (!inviteForm.ownerEmail.trim()) return

    setCreatingInvite(true)
    setInviteEmailStatus(null)
    try {
      try {
        setCompanyID(companyId)
      } catch {
        // ignore
      }
      const { code } = await createCompanyInvite({
        email: inviteForm.ownerEmail.trim(),
        role: inviteForm.role,
        department: inviteForm.department,
        expiresInDays: Number(inviteForm.expiresInDays) || 14,
      })

      const origin =
        typeof window !== "undefined" && window.location?.origin ? window.location.origin : ""
      const basePath = "/App" // Match BrowserRouter basename in app/main.tsx
      const link = `${origin}${basePath}/JoinCompany?code=${encodeURIComponent(code)}`
      setOwnerInviteLink(link)
    } finally {
      setCreatingInvite(false)
    }
  }

  const emailInviteLink = async () => {
    if (!ownerInviteLink) {
      setInviteEmailStatus({ ok: false, msg: "Generate the invite link first." })
      return
    }
    const recipientEmail = inviteForm.ownerEmail.trim()
    if (!recipientEmail) {
      setInviteEmailStatus({ ok: false, msg: "Owner email is required." })
      return
    }

    setSendingInviteEmail(true)
    setInviteEmailStatus(null)
    try {
      const fnBase = getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      })
      const resp = await fetch(`${fnBase}/sendCompanyInviteEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          inviteLink: ownerInviteLink,
          companyName: createdCompanyName || companyState.companyName || "",
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to send invite email")
      }
      setInviteEmailStatus({ ok: true, msg: `Invite email sent to ${recipientEmail}.` })
    } catch (e: any) {
      setInviteEmailStatus({ ok: false, msg: e?.message || "Failed to send invite email" })
    } finally {
      setSendingInviteEmail(false)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create company (Admin)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Creates the company in the main app data (`companies/...`), then lets you add a contract and invite the owner.
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stepper activeStep={step} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {step === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Company details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {!settingsState.auth?.uid && (
              <Alert severity="error" sx={{ mb: 2 }}>
                You must be logged in to create a company.
              </Alert>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={companyForm.createDefaultSite}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, createDefaultSite: e.target.checked }))}
                  />
                }
                label="Create a default site (Main Site)"
              />
              <Box />

              <TextField
                required
                label="Company name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
              />
              <TextField
                label="Legal name"
                value={companyForm.legalName}
                onChange={(e) => setCompanyForm((p) => ({ ...p, legalName: e.target.value }))}
              />

              <FormControl>
                <InputLabel>Company type</InputLabel>
                <Select
                  label="Company type"
                  value={companyForm.companyType}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, companyType: e.target.value as CompanyType }))}
                >
                  <MenuItem value="hospitality">Hospitality</MenuItem>
                  <MenuItem value="supplier">Supplier</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Industry"
                value={companyForm.industry}
                onChange={(e) => setCompanyForm((p) => ({ ...p, industry: e.target.value }))}
              />

              <TextField
                label="Email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm((p) => ({ ...p, email: e.target.value }))}
              />
              <TextField
                label="Phone"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
              />

              <TextField
                label="Website"
                value={companyForm.website}
                onChange={(e) => setCompanyForm((p) => ({ ...p, website: e.target.value }))}
              />
              <Box />

              <TextField
                label="Street"
                value={companyForm.street}
                onChange={(e) => setCompanyForm((p) => ({ ...p, street: e.target.value }))}
              />
              <TextField
                label="City"
                value={companyForm.city}
                onChange={(e) => setCompanyForm((p) => ({ ...p, city: e.target.value }))}
              />
              <TextField
                label="State"
                value={companyForm.state}
                onChange={(e) => setCompanyForm((p) => ({ ...p, state: e.target.value }))}
              />
              <TextField
                label="Post code"
                value={companyForm.zipCode}
                onChange={(e) => setCompanyForm((p) => ({ ...p, zipCode: e.target.value }))}
              />
              <TextField
                label="Country"
                value={companyForm.country}
                onChange={(e) => setCompanyForm((p) => ({ ...p, country: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreateCompany}
                disabled={!settingsState.auth?.uid || creating || !companyForm.name.trim()}
              >
                {creating ? "Creating..." : "Create company"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contract
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Company: <strong>{createdCompanyName || companyState.companyName}</strong>{" "}
              {createdCompanyId ? `(${createdCompanyId})` : ""}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Contract number"
                value={contractForm.contractNumber}
                onChange={(e) => setContractForm((p) => ({ ...p, contractNumber: e.target.value }))}
                helperText="Leave blank to auto-generate"
              />
              <FormControl>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={contractForm.status}
                  onChange={(e) => setContractForm((p) => ({ ...p, status: e.target.value as any }))}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="terminated">Terminated</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Start date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={contractForm.startDate}
                onChange={(e) => setContractForm((p) => ({ ...p, startDate: e.target.value }))}
              />
              <TextField
                label="End date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={contractForm.endDate}
                onChange={(e) => setContractForm((p) => ({ ...p, endDate: e.target.value }))}
              />

              <TextField
                label="Notes / terms"
                value={contractForm.notes}
                onChange={(e) => setContractForm((p) => ({ ...p, notes: e.target.value }))}
                multiline
                minRows={3}
                sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button variant="contained" onClick={handleSaveContract} disabled={savingContract}>
                {savingContract ? "Saving..." : "Save contract"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Invite owner
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Company: <strong>{createdCompanyName || companyState.companyName}</strong>{" "}
              {createdCompanyId ? `(${createdCompanyId})` : ""}
              {createdContractId ? ` • Contract: ${createdContractId}` : ""}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                required
                label="Owner email"
                value={inviteForm.ownerEmail}
                onChange={(e) => setInviteForm((p) => ({ ...p, ownerEmail: e.target.value }))}
              />
              <TextField
                label="Expires in (days)"
                type="number"
                value={inviteForm.expiresInDays}
                onChange={(e) => setInviteForm((p) => ({ ...p, expiresInDays: Number(e.target.value) }))}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreateOwnerInvite}
                disabled={creatingInvite || !inviteForm.ownerEmail.trim()}
              >
                {creatingInvite ? "Generating..." : "Generate invite link"}
              </Button>
            </Box>

            {ownerInviteLink && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Owner invite link:{" "}
                <Box component="span" sx={{ fontFamily: "monospace" }}>
                  {ownerInviteLink}
                </Box>
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 1 }}>
              <Button
                variant="outlined"
                onClick={emailInviteLink}
                disabled={!ownerInviteLink || sendingInviteEmail}
              >
                {sendingInviteEmail ? "Sending..." : "Email invite link"}
              </Button>
            </Box>

            {inviteEmailStatus && (
              <Alert severity={inviteEmailStatus.ok ? "success" : "error"} sx={{ mt: 2 }}>
                {inviteEmailStatus.msg}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

