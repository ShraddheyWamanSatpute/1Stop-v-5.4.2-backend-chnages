import type React from "react"
import { Box, Typography, Container, Button } from "@mui/material"

const CtaSection: React.FC = () => {
  return (
    <Box
      sx={{
        py: 10,
        backgroundColor: "#17234E",
        color: "white",
        textAlign: "center",
      }}
    >
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
          Ready to Transform Your Business?
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.8, mb: 4, maxWidth: 700, mx: "auto" }}>
          Experience the future of hospitality management. Transform your operations with intelligent automation today.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "white",
              color: "#17234E",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" },
              px: 4,
              py: 1.5,
              textTransform: "none",
              fontSize: "1.1rem",
            }}
          >
            Apply for Access
          </Button>
          <Button
            variant="outlined"
            size="large"
            sx={{
              borderColor: "white",
              color: "white",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              px: 4,
              py: 1.5,
              textTransform: "none",
              fontSize: "1.1rem",
            }}
          >
            Book a Chat
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default CtaSection
