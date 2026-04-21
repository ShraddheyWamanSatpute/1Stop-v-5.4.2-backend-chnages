import type React from "react"
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material"
import Footer from "../components/Footer"

const ApproachPage: React.FC = () => {
  const steps = [
    {
      label: "Data Collection & Integration",
      description:
        "We seamlessly integrate with your existing POS, inventory, and scheduling systems to collect comprehensive data about your hospitality operations.",
    },
    {
      label: "AI Analysis & Learning",
      description:
        "Our AI algorithms analyze your data to identify patterns, trends, and opportunities for optimization. The system continuously learns from your business's unique characteristics.",
    },
    {
      label: "Actionable Insights",
      description:
        "We transform complex data into clear, actionable insights that help you make informed decisions about menu pricing, staff scheduling, inventory management, and more.",
    },
    {
      label: "Implementation Support",
      description:
        "Our team of hospitality experts works with you to implement the recommended changes and measure their impact on your business.",
    },
    {
      label: "Continuous Optimization",
      description:
        "As your business evolves, our AI continues to learn and adapt, providing increasingly accurate predictions and recommendations over time.",
    },
  ]

  const values = [
    {
      title: "Data-Driven Excellence",
      description:
        "We believe that the best decisions are made with complete information. Our platform turns your hospitality data into a strategic asset.",
    },
    {
      title: "Hospitality-First Approach",
      description:
        "Built by hospitality professionals for hospitality professionals. We understand the unique challenges of the industry.",
    },
    {
      title: "Continuous Innovation",
      description:
        "We're constantly improving our AI models and adding new features to help you stay ahead of the competition.",
    },
    {
      title: "Human + AI Partnership",
      description:
        "We combine the intuition and creativity of experienced restaurateurs with the analytical power of artificial intelligence.",
    },
  ]

  return (
    <Box>
      <Box
        sx={{
          backgroundColor: "#17234E",
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2 }}>
            Our Approach
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 4 }}>
            How we help restaurants, cafes, and bars transform their operations with AI
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="body1">
          This is the approach page. Content will be added to match the original site.
        </Typography>
        <Grid container spacing={8}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
              Our Process
            </Typography>
            <Stepper orientation="vertical">
              {steps.map((step, index) => (
                <Step active key={index}>
                  <StepLabel>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {step.label}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body1" sx={{ color: "#6B7280", mb: 3 }}>
                      {step.description}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
              Our Values
            </Typography>
            <Grid container spacing={3}>
              {values.map((value, index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        {value.title}
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#6B7280" }}>
                        {value.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>

      <Footer />
    </Box>
  )
}

export default ApproachPage
