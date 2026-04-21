import { alpha } from "@mui/material/styles";
import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material"
import { Download as DownloadIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material"
import { db, get, ref } from "../../backend/services/Firebase"
import { themeConfig } from "../../theme/AppTheme"

type StaffCard = {
  uid: string
  displayName?: string
  firstName?: string
  lastName?: string
  title?: string
  company?: string
  email?: string
  phone?: string
  website?: string
  photoURL?: string
  linkedin?: string
  companyWebsite?: string
  companyLinkedin?: string
  companyInstagram?: string
  companyFacebook?: string
  companyTwitter?: string
}

function buildVCard(card: StaffCard): string {
  const fn = (card.displayName || `${card.firstName || ""} ${card.lastName || ""}`.trim() || "1Stop Contact").trim()
  const lines: string[] = []
  lines.push("BEGIN:VCARD")
  lines.push("VERSION:3.0")
  lines.push(`FN:${escapeVCard(fn)}`)
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`)
  if (card.title) lines.push(`TITLE:${escapeVCard(card.title)}`)
  if (card.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(card.phone)}`)
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(card.email)}`)
  // Prefer a company website for URL, otherwise personal website
  const url = (card.companyWebsite || card.website || "").trim()
  if (url) lines.push(`URL:${escapeVCard(url)}`)
  // Social profiles (vCard extension fields)
  if (card.linkedin) lines.push(`X-SOCIALPROFILE;type=linkedin:${escapeVCard(card.linkedin)}`)
  lines.push("END:VCARD")
  return lines.join("\r\n")
}

function escapeVCard(v: string): string {
  return String(v || "")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

export default function StaffCardLanding() {
  const { uid } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<StaffCard | null>(null)

  useEffect(() => {
    const run = async () => {
      const staffUid = String(uid || "").trim()
      if (!staffUid) {
        setError("Invalid staff link.")
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const snap = await get(ref(db, `admin/staffCards/${staffUid}`))
        if (!snap.exists()) {
          setError("This staff card is not published yet.")
          setCard(null)
          setLoading(false)
          return
        }
        const v = snap.val() || {}
        setCard({
          uid: staffUid,
          displayName: v.displayName || v.name || "",
          firstName: v.firstName || "",
          lastName: v.lastName || "",
          title: v.title || "",
          company: v.company || "",
          email: v.email || "",
          phone: v.phone || "",
          website: v.website || "",
          photoURL: v.photoURL || "",
          linkedin: v.linkedin || "",
          companyWebsite: v.companyWebsite || v.website || "",
          companyLinkedin: v.companyLinkedin || "",
          companyInstagram: v.companyInstagram || "",
          companyFacebook: v.companyFacebook || "",
          companyTwitter: v.companyTwitter || "",
        })
      } catch (e: any) {
        setError(e?.message || "Failed to load staff card.")
        setCard(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [uid])

  const vcardText = useMemo(() => (card ? buildVCard(card) : ""), [card])

  const downloadVCard = () => {
    if (!card) return
    const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(card.displayName || "1stop-contact").replace(/[^\w\- ]+/g, "").trim() || "1stop-contact"}.vcf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        background: `radial-gradient(1200px circle at 20% 10%, ${alpha(
          themeConfig.brandColors.offWhite,
          0.08,
        )}, transparent 45%), linear-gradient(180deg, ${themeConfig.colors.primary.dark} 0%, ${
          themeConfig.brandColors.navy
        } 100%)`,
      }}
    >
      <Card sx={{ maxWidth: 520, width: "100%", borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="overline" sx={{ opacity: 0.7 }}>
            1Stop • Staff introduction
          </Typography>

          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography>Loading…</Typography>
            </Box>
          )}

          {error && !loading && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && card && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                <Avatar
                  src={card.photoURL || undefined}
                  sx={{ width: 72, height: 72, bgcolor: themeConfig.brandColors.navy }}
                >
                  {(card.displayName || "S").slice(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {card.displayName || `${card.firstName || ""} ${card.lastName || ""}`.trim() || "Staff"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.title || ""}
                    {card.title && card.company ? " • " : ""}
                    {card.company || ""}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "grid", gap: 0.75 }}>
                {card.email ? (
                  <Typography variant="body2">
                    <strong>Email:</strong> {card.email}
                  </Typography>
                ) : null}
                {card.phone ? (
                  <Typography variant="body2">
                    <strong>Phone:</strong> {card.phone}
                  </Typography>
                ) : null}
                {(card.companyWebsite || card.website) ? (
                  <Typography variant="body2">
                    <strong>Website:</strong> {card.companyWebsite || card.website}
                  </Typography>
                ) : null}
                {card.linkedin ? (
                  <Typography variant="body2">
                    <strong>LinkedIn:</strong>{" "}
                    <a href={card.linkedin} target="_blank" rel="noreferrer">
                      {card.linkedin}
                    </a>
                  </Typography>
                ) : null}
              </Box>

              <Box sx={{ display: "flex", gap: 1, mt: 3, flexWrap: "wrap" }}>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadVCard}>
                  Add to contacts
                </Button>
                <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => navigate("/")}>
                  Open 1Stop
                </Button>
                {card.companyLinkedin ? (
                  <Button variant="outlined" startIcon={<OpenInNewIcon />} href={card.companyLinkedin} target="_blank" rel="noreferrer">
                    Company LinkedIn
                  </Button>
                ) : null}
                {card.companyInstagram ? (
                  <Button variant="outlined" startIcon={<OpenInNewIcon />} href={card.companyInstagram} target="_blank" rel="noreferrer">
                    Instagram
                  </Button>
                ) : null}
                {card.companyFacebook ? (
                  <Button variant="outlined" startIcon={<OpenInNewIcon />} href={card.companyFacebook} target="_blank" rel="noreferrer">
                    Facebook
                  </Button>
                ) : null}
                {card.companyTwitter ? (
                  <Button variant="outlined" startIcon={<OpenInNewIcon />} href={card.companyTwitter} target="_blank" rel="noreferrer">
                    X / Twitter
                  </Button>
                ) : null}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                Tip: on iPhone/Android, “Add to contacts” downloads a contact card you can open to save.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

