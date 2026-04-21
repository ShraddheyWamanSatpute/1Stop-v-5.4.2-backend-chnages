"use client"

import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material"
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material"
import OrderDeliveryPanel from "../../components/stock/OrderDeliveryPanel"

type LocationState = {
  purchaseIds?: string[]
}

export default function OrderDelivery() {
  const navigate = useNavigate()
  const location = useLocation()

  const purchaseIds = (location.state as LocationState | null)?.purchaseIds || []
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/Stock/Order")} variant="outlined">
          Back to Order
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={() => navigate("/Stock/PurchaseOrders")} variant="text">
          Go to Purchase Orders
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Order Delivery
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Send purchase orders to suppliers by email, or use API ordering (coming soon).
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <OrderDeliveryPanel purchaseIds={purchaseIds} />
      </Paper>
    </Box>
  )
}

