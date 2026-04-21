import { useEffect, useState } from "react"
import { Alert, Box, Button, Card, CardContent, Divider, Grid, TextField, Typography } from "@mui/material"
import { QrCode2 as QrCodeIcon, Link as LinkIcon } from "@mui/icons-material"
import { QRCodeCanvas } from "qrcode.react"
import { useNavigate } from "react-router-dom"
import DataHeader from "../../app/frontend/components/reusable/DataHeader"
import { useAdmin } from "../backend/context/AdminContext"
import { db, get, ref } from "../backend/services/Firebase"
import { AdminPageShell } from "./shared/AdminPageShell"

export default function AdminReferrals() {
  const { state } = useAdmin()
  const navigate = useNavigate()
  const uid = state.user?.uid || ""

  const [myLink, setMyLink] = useState("")
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [profileSummary, setProfileSummary] = useState<{
    displayName: string
    email: string
    phone: string
    company: string
    linkedin: string
    photoURL: string
  } | null>(null)

  useEffect(() => {
    if (!uid) return
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    setMyLink(`${origin}/Staff/${uid}`)
  }, [uid])

  useEffect(() => {
    const run = async () => {
      if (!uid) return
      try {
        const snap = await get(ref(db, `admin/staffCards/${uid}`))
        if (!snap.exists()) {
          setIsPublished(false)
          setProfileSummary(null)
          setStatusMsg("Complete your Admin Profile to enable your QR.")
          return
        }
        const v: any = snap.val() || {}
        setIsPublished(true)
        setProfileSummary({
          displayName: v.displayName || `${v.firstName || ""} ${v.lastName || ""}`.trim() || "Staff",
          email: v.email || state.user?.email || "",
          phone: v.phone || "",
          company: v.company || "",
          linkedin: v.linkedin || "",
          photoURL: v.photoURL || "",
        })
        setStatusMsg(null)
      } catch {
        setIsPublished(false)
        setProfileSummary(null)
      }
    }
    run()
  }, [uid, state.user?.email])

  return (
    <AdminPageShell
      title="Referrals"
      description="Your QR-based networking and referral tools now use the same admin shell and card spacing as the rest of the upgraded workspace."
      metrics={[
        { label: "Profile status", value: isPublished ? "Published" : "Draft", icon: <QrCodeIcon fontSize="small" /> },
        { label: "Public link", value: myLink ? "Ready" : "Missing", icon: <LinkIcon fontSize="small" /> },
      ]}
    >
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        additionalButtons={[
          {
            label: "Edit profile",
            icon: <></>,
            onClick: () => navigate("/Profile"),
            variant: "outlined",
          },
        ]}
      />

      {statusMsg ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {statusMsg}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Your staff QR</Typography>
              <Typography variant="body2" color="text.secondary">
                This QR links to your public 1Stop staff page. Scanners do not need an account.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                {isPublished ? <QRCodeCanvas value={myLink || ""} size={220} /> : <Typography color="text.secondary">Profile not set up yet.</Typography>}
              </Box>
              <TextField fullWidth label="Your public link" value={myLink} InputProps={{ readOnly: true }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 1 }}>
                <Button variant="outlined" onClick={() => window.open(myLink, "_blank", "noopener,noreferrer")} disabled={!isPublished || !myLink}>
                  Preview public page
                </Button>
                <Button variant="contained" onClick={() => navigate("/Profile")} disabled={!uid}>
                  {isPublished ? "Update profile" : "Set up profile"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Profile used for QR</Typography>
              <Typography variant="body2" color="text.secondary">
                Your public staff page uses the details from the Admin Profile page.
              </Typography>
              <Divider sx={{ my: 2 }} />
              {!profileSummary ? (
                <Typography color="text.secondary">No profile saved yet.</Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 0.75 }}>
                  <Typography>
                    <strong>Name:</strong> {profileSummary.displayName}
                  </Typography>
                  {profileSummary.company ? (
                    <Typography>
                      <strong>Company:</strong> {profileSummary.company}
                    </Typography>
                  ) : null}
                  {profileSummary.email ? (
                    <Typography>
                      <strong>Email:</strong> {profileSummary.email}
                    </Typography>
                  ) : null}
                  {profileSummary.phone ? (
                    <Typography>
                      <strong>Phone:</strong> {profileSummary.phone}
                    </Typography>
                  ) : null}
                  {profileSummary.linkedin ? (
                    <Typography>
                      <strong>LinkedIn:</strong> {profileSummary.linkedin}
                    </Typography>
                  ) : null}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminPageShell>
  )
}
