"use client"

import type React from "react"
import { Box, Typography, Card, CardContent, Container } from "@mui/material"
import { Construction as ConstructionIcon } from "@mui/icons-material"

const Temp: React.FC = () => {
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
            <ConstructionIcon
              sx={{
                fontSize: 80,
                color: "warning.main",
                mb: 2,
              }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              This section is temporarily unavailable
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              We're working hard to bring you an amazing experience. Please check back soon!
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default Temp
