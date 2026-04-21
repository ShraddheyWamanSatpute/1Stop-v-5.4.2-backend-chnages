import React, { useEffect, useMemo, useState } from "react"
import { Box, Card, CardContent, Divider, Grid, TextField, Typography, Alert } from "@mui/material"
import { Person as PersonIcon } from "@mui/icons-material"
import DataHeader from "../../components/reusable/DataHeader"
import { useSettings } from "../../../backend/context/SettingsContext"
import { db, get, ref, set } from "../../../backend/services/Firebase"

type StaffCardDoc = {
  uid: string
  // Public card fields (already used by landing page)
  displayName?: string
  title?: string
  company?: string
  email?: string
  phone?: string
  website?: string
  photoURL?: string

  // Profile fields requested
  firstName?: string
  lastName?: string
  linkedin?: string

  // Company + socials (managed here, used by QR/landing)
  companyWebsite?: string
  companyLinkedin?: string
  companyInstagram?: string
  companyFacebook?: string
  companyTwitter?: string

  createdAt?: number
  updatedAt?: number
}

export default function AdminProfile() {
  const { state: settingsState } = useSettings()
  const uid = settingsState.auth?.uid || ""

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedin: "",
    photoURL: "",
    title: "",
    companyName: "",
    companyWebsite: "",
    companyLinkedin: "",
    companyInstagram: "",
    companyFacebook: "",
    companyTwitter: "",
  })

  const displayName = useMemo(() => {
    const fromNames = `${form.firstName} ${form.lastName}`.trim()
    return fromNames || settingsState.auth?.email || "Admin"
  }, [form.firstName, form.lastName, settingsState.auth?.email])

  useEffect(() => {
    const run = async () => {
      if (!uid) return
      setLoading(true)
      setError(null)
      setSaved(false)
      try {
        const snap = await get(ref(db, `admin/staffCards/${uid}`))
        const v: StaffCardDoc = (snap.exists() ? (snap.val() as any) : {}) || {}

        const inferredName =
          v.displayName ||
          `${v.firstName || ""} ${v.lastName || ""}`.trim() ||
          (settingsState.user as any)?.displayName ||
          `${(settingsState.user as any)?.firstName || ""} ${(settingsState.user as any)?.lastName || ""}`.trim()

        const inferredFirst = v.firstName || (inferredName || "").split(" ").slice(0, 1).join(" ")
        const inferredLast = v.lastName || (inferredName || "").split(" ").slice(1).join(" ")

        setForm({
          firstName: inferredFirst || "",
          lastName: inferredLast || "",
          email: v.email || settingsState.auth?.email || (settingsState.user as any)?.email || "",
          phone: v.phone || (settingsState.user as any)?.phone || (settingsState.user as any)?.mobile || "",
          linkedin: v.linkedin || "",
          photoURL: v.photoURL || settingsState.auth?.photoURL || (settingsState.user as any)?.photoURL || "",
          title: v.title || (settingsState.user as any)?.title || (settingsState.user as any)?.jobTitle || "",
          companyName: v.company || "",
          companyWebsite: v.companyWebsite || v.website || "",
          companyLinkedin: v.companyLinkedin || "",
          companyInstagram: v.companyInstagram || "",
          companyFacebook: v.companyFacebook || "",
          companyTwitter: v.companyTwitter || "",
        })
      } catch (e: any) {
        setError(e?.message || "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [uid, settingsState.auth?.email, settingsState.auth?.photoURL, settingsState.user])

  const save = async () => {
    if (!uid) return
    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      const now = Date.now()

      const doc: StaffCardDoc = {
        uid,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: `${form.firstName} ${form.lastName}`.trim() || displayName,
        title: form.title.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        linkedin: form.linkedin.trim(),
        photoURL: form.photoURL.trim(),

        // Public-facing company fields (kept for backward compatibility)
        company: form.companyName.trim(),
        website: form.companyWebsite.trim(),

        // Company socials
        companyWebsite: form.companyWebsite.trim(),
        companyLinkedin: form.companyLinkedin.trim(),
        companyInstagram: form.companyInstagram.trim(),
        companyFacebook: form.companyFacebook.trim(),
        companyTwitter: form.companyTwitter.trim(),

        updatedAt: now,
      }

      // Preserve createdAt if already exists
      const existing = await get(ref(db, `admin/staffCards/${uid}`))
      if (!existing.exists()) {
        doc.createdAt = now
      } else {
        doc.createdAt = (existing.val() as any)?.createdAt || now
      }

      await set(ref(db, `admin/staffCards/${uid}`), doc)
      setSaved(true)
    } catch (e: any) {
      setError(e?.message || "Failed to save profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        onCreateNew={undefined}
        additionalButtons={[
          {
            label: "Save",
            icon: <PersonIcon />,
            onClick: () => save(),
            variant: "contained",
            disabled: loading || !uid,
          },
        ]}
      />

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}
      {saved ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Profile saved. Your QR page and public staff page will now use these details.
        </Alert>
      ) : null}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Personal details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="First name"
                fullWidth
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Surname"
                fullWidth
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="LinkedIn (profile URL)"
                fullWidth
                value={form.linkedin}
                onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Profile picture URL"
                fullWidth
                value={form.photoURL}
                onChange={(e) => setForm((p) => ({ ...p, photoURL: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Title (optional)"
                fullWidth
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Company (shown on your public staff page)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company name"
                fullWidth
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company website"
                fullWidth
                value={form.companyWebsite}
                onChange={(e) => setForm((p) => ({ ...p, companyWebsite: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company LinkedIn (URL)"
                fullWidth
                value={form.companyLinkedin}
                onChange={(e) => setForm((p) => ({ ...p, companyLinkedin: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Instagram (URL)"
                fullWidth
                value={form.companyInstagram}
                onChange={(e) => setForm((p) => ({ ...p, companyInstagram: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Facebook (URL)"
                fullWidth
                value={form.companyFacebook}
                onChange={(e) => setForm((p) => ({ ...p, companyFacebook: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Twitter/X (URL)"
                fullWidth
                value={form.companyTwitter}
                onChange={(e) => setForm((p) => ({ ...p, companyTwitter: e.target.value }))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}

