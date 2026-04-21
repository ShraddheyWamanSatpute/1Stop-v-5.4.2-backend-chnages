"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Box, CircularProgress } from "@mui/material"

const SupplyClientInvite: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = useMemo(() => searchParams.get("code") || "", [searchParams])

  useEffect(() => {
    const next = `/ConnectSupplier${code ? `?code=${encodeURIComponent(code)}` : ""}`
    navigate(next, { replace: true })
  }, [code, navigate])

  return (
    <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  )
}

export default SupplyClientInvite

