"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { Box, Typography, Card, CardContent, Container } from "@mui/material"
import { LocationOn as LocationIcon } from "@mui/icons-material"

const LocationPlaceholder: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 200px)",
          textAlign: "center",
        }}
      >
        <Card
          sx={{
            p: 4,
            maxWidth: 500,
            width: "100%",
            boxShadow: 3,
          }}
        >
          <CardContent>
            <LocationIcon
              sx={{
                fontSize: 80,
                color: themeConfig.brandColors.navy,
                mb: 2,
              }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Please choose a location to continue
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Select a company from the dropdown menu to access this section and manage your business operations.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default LocationPlaceholder
