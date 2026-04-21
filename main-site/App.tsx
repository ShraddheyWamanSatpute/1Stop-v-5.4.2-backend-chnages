import { Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@mui/material/styles"
import { ScopedCssBaseline } from "@mui/material"
import { Suspense, lazy } from "react"
import theme from "./theme"
import Header from "./components/Header"

// Lazy load all pages for code splitting and optimization
const HomePage = lazy(() => import("./pages/HomePage"))
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const ApproachPage = lazy(() => import("./pages/ApproachPage"))
const ContactPage = lazy(() => import("./pages/ContactPage"))
const SalesTrackingPage = lazy(() => import("./pages/features/SalesTrackingPage"))
const StaffPerformancePage = lazy(() => import("./pages/features/StaffPerformancePage"))
const InventoryOptimizationPage = lazy(() => import("./pages/features/InventoryOptimizationPage"))

// QR Routes - Public facing pages (not admin routes)
const QRFormPage = lazy(() => import("../admin/frontend/qr/Form"))
const QRLandingPage = lazy(() => import("../admin/frontend/qr/Landing"))
const AboutUsPage = lazy(() => import("./pages/AboutUsPage"))
const CareersPage = lazy(() => import("./pages/CareersPage"))
const BlogPage = lazy(() => import("./pages/BlogPage"))
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"))
const TermsPage = lazy(() => import("./pages/TermsPage"))
const CookiesPage = lazy(() => import("./pages/CookiesPage"))
const CustomerInsightsPage = lazy(() => import("./pages/CustomerInsightsPage"))

import { AuthProvider } from "./contexts/AuthContext"

// Import global loader for consistent loading experience
import { GlobalLoader } from "../app/backend/shared/GlobalLoader"

// Loading fallback component - uses global loader
const LoadingFallback = () => (
  <GlobalLoader message="Loading..." />
)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ScopedCssBaseline>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <>
                  <Header />
                  <HomePage />
                </>
              }
            />
            <Route
              path="/Features"
              element={
                <>
                  <Header />
                  <FeaturesPage />
                </>
              }
            />
            <Route
              path="/Features/SalesTracking"
              element={
                <>
                  <Header />
                  <SalesTrackingPage />
                </>
              }
            />
            <Route
              path="/Features/StaffPerformance"
              element={
                <>
                  <Header />
                  <StaffPerformancePage />
                </>
              }
            />
            <Route
              path="/Features/InventoryOptimization"
              element={
                <>
                  <Header />
                  <InventoryOptimizationPage />
                </>
              }
            />
            <Route
              path="/Dashboard"
              element={
                <>
                  <Header />
                  <DashboardPage />
                </>
              }
            />
            <Route
              path="/Approach"
              element={
                <>
                  <Header />
                  <ApproachPage />
                </>
              }
            />
            <Route
              path="/Contact"
              element={
                <>
                  <Header />
                  <ContactPage />
                </>
              }
            />
            <Route
              path="/AboutUs"
              element={
                <>
                  <Header />
                  <AboutUsPage />
                </>
              }
            />
            <Route
              path="/Careers"
              element={
                <>
                  <Header />
                  <CareersPage />
                </>
              }
            />
            <Route
              path="/Blog"
              element={
                <>
                  <Header />
                  <BlogPage />
                </>
              }
            />
            <Route
              path="/PrivacyPolicy"
              element={
                <>
                  <Header />
                  <PrivacyPolicyPage />
                </>
              }
            />
            <Route
              path="/Terms"
              element={
                <>
                  <Header />
                  <TermsPage />
                </>
              }
            />
            <Route
              path="/Cookies"
              element={
                <>
                  <Header />
                  <CookiesPage />
                </>
              }
            />

            <Route
              path="/CustomerInsights"
              element={
                <>
                  <Header />
                  <CustomerInsightsPage />
                </>
              }
            />

            {/* QR Routes - Public facing pages (admin routes are now handled at /admin route) */}
            <Route path="/Qr/:adminId" element={<QRLandingPage />} />
            <Route path="/QrForm" element={<QRFormPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ScopedCssBaseline>
    </ThemeProvider>
  )
}

export default App
