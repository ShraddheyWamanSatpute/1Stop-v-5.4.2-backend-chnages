import type React from "react"
import { Box, Typography, Container, Grid, Card, CardContent, Button, List, ListItem, ListItemIcon, ListItemText } from "@mui/material"
import { Check } from "@mui/icons-material"

const PricingSection: React.FC = () => {
  const plans = [
    {
      name: "Starter",
      price: "$199",
      period: "per month",
      description: "Perfect for small restaurants, cafes, and bars just getting started with data-driven operations.",
      features: [
        "Basic Analytics Dashboard",
        "Menu Performance Tracking",
        "Weekly Insights Report",
        "Email Support",
        "Up to 3 Staff Members",
      ],
      buttonText: "Get Started",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "$399",
      period: "per month",
      description: "Comprehensive solution for growing hospitality businesses looking to optimize operations.",
      features: [
        "Advanced Analytics Dashboard",
        "Menu Optimization",
        "Inventory Management",
        "Staff Scheduling",
        "Daily Insights Report",
        "Priority Support",
        "Up to 10 Staff Members",
      ],
      buttonText: "Get Started",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "Tailored solution for multi-location venues and hospitality groups.",
      features: [
        "Custom Analytics Dashboard",
        "Advanced Menu Optimization",
        "Inventory & Supply Chain Management",
        "Advanced Staff Management",
        "Real-time Insights",
        "Dedicated Account Manager",
        "Unlimited Staff Members",
        "Multi-location Support",
      ],
      buttonText: "Contact Sales",
      highlighted: false,
    },
  ]

  return (
    <Box sx={{ py: 8, backgroundColor: "white" }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: "#17234E" }}>
            Simple, Transparent Pricing
          </Typography>
          <Typography variant="h6" sx={{ color: "#6B7280", maxWidth: 600, mx: "auto" }}>
            Choose the plan that's right for your business
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {plans.map((plan, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  boxShadow: plan.highlighted ? "0 8px 30px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.1)",
                  border: plan.highlighted ? "2px solid #3F51B5" : "none",
                  transform: plan.highlighted ? "scale(1.05)" : "none",
                  transition: "transform 0.3s ease",
                  "&:hover": {
                    transform: plan.highlighted ? "scale(1.05)" : "translateY(-8px)",
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: plan.highlighted ? "#3F51B5" : "#17234E" }}>
                    {plan.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", mb: 2 }}>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {plan.price}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#6B7280", ml: 1 }}>
                      {plan.period}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: "#6B7280", mb: 3 }}>
                    {plan.description}
                  </Typography>
                  <List sx={{ mb: 3 }}>
                    {plan.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Check sx={{ color: "#3F51B5" }} />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant={plan.highlighted ? "contained" : "outlined"}
                    fullWidth
                    sx={{
                      py: 1.5,
                      backgroundColor: plan.highlighted ? "#3F51B5" : "transparent",
                      borderColor: "#3F51B5",
                      color: plan.highlighted ? "white" : "#3F51B5",
                      "&:hover": {
                        backgroundColor: plan.highlighted ? "#303F9F" : "rgba(63, 81, 181, 0.1)",
                      },
                    }}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

export default PricingSection
