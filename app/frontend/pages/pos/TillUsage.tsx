"use client"

import { alpha, useTheme } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, CircularProgress, Alert } from "@mui/material"
import { useCompany } from "../../../backend/context/CompanyContext"

import TillUsageComponent from "../../components/pos/TillUsage"
import { useStock } from "../../../backend/context/StockContext"
import type { Card as TillCard } from "../../../backend/interfaces/POS"
import { themeConfig } from "../../../theme/AppTheme"

const TillUsagePage: React.FC = () => {
  const theme = useTheme()
  const { screenId } = useParams<{ screenId?: string }>()
  const { state: companyState } = useCompany()
  const { fetchTillScreen, saveTillScreenWithId } = useStock()

  const [cards, setCards] = useState<TillCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screenName, setScreenName] = useState("")

  useEffect(() => {
    loadTillScreen()
  }, [screenId, companyState.companyID, companyState.selectedSiteID])

  const loadTillScreen = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      if (screenId) {
        // Load existing screen
        const screenData = await fetchTillScreen(screenId)
        if (screenData) {
          setCards(screenData.cards || [])
          setScreenName(screenData.name || `Screen ${screenId}`)
        } else {
          setError("Till screen not found")
        }
      } else {
        // Create default screen layout
        const defaultCards: TillCard[] = [
          {
            id: "bill-window-1",
            type: "billWindow",
            content: "Standard",
            x: 10,
            y: 10,
            width: 250,
            height: 400,
            // white -> off-white
            cardColor: theme.palette.secondary.main,
            fontSize: 12,
            // black -> navy
            fontColor: theme.palette.primary.main,
            zIndex: 1,
            isVisible: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: "numpad-1",
            type: "numpad",
            content: "Numpad",
            x: 270,
            y: 10,
            width: 180,
            height: 240,
            // grey -> off-white
            cardColor: theme.palette.secondary.main,
            fontSize: 12,
            // black -> navy
            fontColor: theme.palette.primary.main,
            zIndex: 1,
            isVisible: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: "table-plan-1",
            type: "function",
            content: "Table Plan",
            x: 460,
            y: 10,
            width: 300,
            height: 200,
            cardColor: alpha(themeConfig.colors.success.main, 0.12),
            fontSize: 14,
            fontColor: themeConfig.colors.success.main,
            zIndex: 1,
            isVisible: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: "payment-1",
            type: "function",
            content: "Payment",
            x: 460,
            y: 220,
            width: 300,
            height: 150,
            cardColor: alpha(themeConfig.colors.warning.main, 0.12),
            fontSize: 14,
            fontColor: themeConfig.colors.warning.main,
            zIndex: 1,
            isVisible: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]
        setCards(defaultCards)
        setScreenName("New Till Screen")
      }

      setError(null)
    } catch (err: any) {
      console.error("Error loading till screen:", err)
      setError(err.message || "Failed to load till screen")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCards = async (updatedCards: TillCard[]) => {
    setCards(updatedCards)

    // Auto-save changes
    if (companyState.companyID && companyState.selectedSiteID && screenId) {
      try {
        await saveTillScreenWithId(screenId, {
          id: screenId,
          name: screenName,
          cards: updatedCards,
          updatedAt: Date.now(),
        })
      } catch (err) {
        console.error("Error saving till screen:", err)
      }
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Till Screen...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Unable to load the till screen. Please check your connection and try again.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: "100vh", overflow: "hidden" }}>
      <TillUsageComponent screenId={screenId} cards={cards} onUpdateCards={handleUpdateCards} />
    </Box>
  )
}

export default TillUsagePage
