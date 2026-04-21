import { Box } from "@mui/material"
import Header from "../components/Header"
import HeroSection from "../components/HeroSection"
import RevolutionSection from "../components/RevolutionSection"
import InsightsSection from "../components/InsightsSection"
import StorySection from "../components/StorySection"
import ContactSection from "../components/ContactSection"
import Footer from "../components/Footer"

const HomePage = () => {
  return (
    <Box>
      <Header />
      <Box sx={{ pt: "80px" }}>
        {" "}
        {/* Account for fixed header */}
        <HeroSection />
        <Box id="features">
          <RevolutionSection />
        </Box>
        <Box id="dashboard">
          <InsightsSection />
        </Box>
        <Box id="approach">
          <StorySection />
        </Box>
        <Box id="contact">
          <ContactSection />
        </Box>
        <Footer />
      </Box>
    </Box>
  )
}

export default HomePage
