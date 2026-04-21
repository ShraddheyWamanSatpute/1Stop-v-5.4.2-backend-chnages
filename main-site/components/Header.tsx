"use client"

import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"

// The exact color from the logo - updated to match #17234E
const LOGO_NAVY_BLUE = "#17234E"

const navItems = [
  { name: "Features", sectionId: "features" },
  { name: "Dashboard", sectionId: "dashboard" },
  { name: "Our Approach", sectionId: "approach" },
  { name: "Contact", sectionId: "contact" },
]

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const scrollToSection = (sectionId: string) => {
    // If not on home page, navigate to home first
    if (location.pathname !== "/") {
      navigate("/")
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    } else {
      // Already on home page, just scroll
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const handleLogoClick = () => {
    if (location.pathname !== "/") {
      navigate("/")
      // Wait for navigation to complete, then scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }, 100)
    } else {
      // Already on home page, just scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center", height: "100%", bgcolor: LOGO_NAVY_BLUE }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          my: 3,
          cursor: "pointer",
          color: "white",
        }}
        onClick={handleLogoClick}
      >
        <img src="/images/logo.png" alt="One-Stop Solutions" style={{ height: 32, width: 32, marginRight: 8 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: "white" }}>
          One-Stop Solutions
        </Typography>
      </Box>
      <List sx={{ px: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => scrollToSection(item.sectionId)}
              sx={{
                textAlign: "center",
                py: 2,
                borderRadius: 2,
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{
                  fontSize: "1.1rem",
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding sx={{ mt: 3 }}>
          <ListItemButton
            onClick={() => scrollToSection("contact")}
            sx={{
              textAlign: "center",
              py: 2,
              backgroundColor: "white",
              borderRadius: 2,
              mx: 1,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.9)",
              },
            }}
          >
            <ListItemText
              primary="Book a chat"
              primaryTypographyProps={{
                color: LOGO_NAVY_BLUE,
                fontWeight: 600,
                fontSize: "1.1rem",
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: LOGO_NAVY_BLUE,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 1100,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: { xs: 1, md: 1.5 },
            minHeight: { xs: 64, md: 70 },
          }}
        >
          {/* Logo and Company Name */}
          <Box
            onClick={handleLogoClick}
            sx={{
              display: "flex",
              alignItems: "center",
              color: "white",
              textDecoration: "none",
              cursor: "pointer",
              "&:hover": {
                opacity: 0.9,
              },
            }}
          >
            <Box
              component="img"
              src="/images/logo.png"
              alt="One-Stop Solutions"
              sx={{
                height: { xs: 36, md: 40 },
                width: { xs: 36, md: 40 },
                mr: 2,
              }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "1.1rem", md: "1.25rem" },
                color: "white",
                letterSpacing: "-0.01em",
              }}
            >
              One-Stop Solutions
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.name}
                onClick={() => scrollToSection(item.sectionId)}
                sx={{
                  color: "white",
                  px: 2,
                  py: 1,
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  textTransform: "none",
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                {item.name}
              </Button>
            ))}
            <Button
              variant="contained"
              onClick={() => scrollToSection("contact")}
              sx={{
                ml: 2,
                backgroundColor: "white",
                color: LOGO_NAVY_BLUE,
                px: 3,
                py: 1,
                fontSize: "0.9rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                },
                "& .MuiButton-endIcon": {
                  ml: 0.5,
                },
              }}
              endIcon={<ArrowForwardIcon fontSize="small" />}
            >
              Book a chat
            </Button>
          </Box>

          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="end"
            onClick={handleDrawerToggle}
            sx={{
              display: { md: "none" },
              color: "white",
            }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
            bgcolor: LOGO_NAVY_BLUE,
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  )
}

export default Header
