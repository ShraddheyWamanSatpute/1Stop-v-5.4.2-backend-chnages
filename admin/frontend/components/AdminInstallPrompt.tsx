"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Box, Button, IconButton, Paper, Stack, Typography } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import GetAppIcon from "@mui/icons-material/GetApp"
import {
  isAndroidUserAgent,
  isAppleOrAndroidDevice,
  isIOSFamily,
  isStandalonePWADisplay,
} from "../../../app/utils/deviceDetection"
import { themeConfig } from "../../../app/backend/context/AppTheme"

/** Separate from `1stop_app_install_prompt_dismissed` (main `/App` shell) so each product counts independently. */
const SESSION_DISMISS_KEY = "1stop_admin_install_prompt_dismissed"

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

/**
 * On iOS/Android, encourages installing the 1Stop Admin web app (PWA / Add to Home Screen).
 * Shown on every route under `/Admin` until dismissed for the session or already running standalone.
 */
const AdminInstallPrompt: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1"
    } catch {
      return false
    }
  })
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(null)

  const eligible =
    typeof window !== "undefined" &&
    !dismissed &&
    isAppleOrAndroidDevice() &&
    !isStandalonePWADisplay()

  useEffect(() => {
    if (!eligible) return
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEventLike)
    }
    window.addEventListener("beforeinstallprompt", onBip)
    return () => window.removeEventListener("beforeinstallprompt", onBip)
  }, [eligible])

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1")
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }, [])

  const installAndroid = useCallback(async () => {
    if (!deferred?.prompt) return
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      /* ignore */
    }
    setDeferred(null)
  }, [deferred])

  if (!eligible) return null

  const adminPath = `${window.location.origin}/Admin`

  return (
    <Paper
      elevation={12}
      square
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.snackbar + 1,
        borderTop: `3px solid ${themeConfig.brandColors.navy}`,
        px: 2,
        py: 1.5,
        pb: `calc(12px + env(safe-area-inset-bottom, 0px))`,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <GetAppIcon sx={{ color: themeConfig.brandColors.navy, mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: themeConfig.brandColors.navy }}>
            Install 1Stop Admin
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Add this admin app to your home screen for quicker access. It uses the{" "}
            <Box component="span" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              /Admin
            </Box>{" "}
            path ({adminPath}).
          </Typography>
          {isIOSFamily() && (
            <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Safari: tap Share, then &quot;Add to Home Screen&quot;.
            </Typography>
          )}
          {isAndroidUserAgent() && !deferred && (
            <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Chrome: open the menu (⋮) and tap &quot;Install app&quot; or &quot;Add to Home screen&quot;.
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          {isAndroidUserAgent() && deferred && (
            <Button variant="contained" size="small" onClick={installAndroid} sx={{ whiteSpace: "nowrap" }}>
              Install
            </Button>
          )}
          <IconButton size="small" aria-label="Dismiss admin install prompt" onClick={dismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  )
}

export default AdminInstallPrompt
