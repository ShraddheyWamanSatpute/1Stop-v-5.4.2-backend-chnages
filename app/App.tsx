import React from "react"
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom"
import { isMobilePhone } from "./utils/deviceDetection"
import { useCompany } from "./backend/context/CompanyContext"
import { getCompanyLayout } from "./frontend/layouts/companyLayout"
import Login from "./frontend/pages/Login"
import ProtectedRoute from "./backend/functions/ProtectedRoute"
import Register from "./frontend/pages/Register"
import Join from "./frontend/pages/Join"
import JoinCompany from "./frontend/components/auth/JoinCompany"
import EmployeeOnboarding from "./frontend/pages/EmployeeOnboarding"
import ResetPassword from "./frontend/pages/ResetPassword"
import DeviceRouter from "./components/DeviceRouter"
import AppInstallPrompt from "./frontend/components/global/AppInstallPrompt"

// Lazy-load heavy pages/layouts to speed up initial load
const MainLayout = React.lazy(() => import("./frontend/layouts/MainLayout"))
const Settings = React.lazy(() => import("./frontend/pages/Settings"))

// Company related pages
const Company = React.lazy(() => import("./frontend/pages/Company"))
const CompanySetup = React.lazy(() => import("./frontend/pages/company/CompanySetup"))
const CreateCompany = React.lazy(() => import("./frontend/pages/CreateCompany"))
import { CalculatorProvider } from "./backend/context/CalculatorContext"
const Temp = React.lazy(() => import("./frontend/pages/Temp"))
import AcceptSiteInvite from "./frontend/pages/AcceptSiteInvite"
import AcceptAdminInvite from "./frontend/pages/AcceptAdminInvite"
import StaffCardLanding from "./frontend/pages/StaffCardLanding"
import { LazyProviders } from "./frontend/components/global/LazyProviders"
const HR = React.lazy(() => import("./frontend/pages/HR"))
const Bookings = React.lazy(() => import("./frontend/pages/Bookings"))
const Finance = React.lazy(() => import("./frontend/pages/Finance"))
const POS = React.lazy(() => import("./frontend/pages/POS"))
const TillScreen = React.lazy(() => import("./frontend/pages/pos/TillScreen"))
const TillUsage = React.lazy(() => import("./frontend/pages/pos/TillUsage"))
const MessengerComponent = React.lazy(() => import("./frontend/pages/Messenger"))
const Dashboard = React.lazy(() => import("./frontend/pages/Dashboard"))
const StockDashboard = React.lazy(() => import("./frontend/pages/StockDashboard"))
const Analytics = React.lazy(() => import("./frontend/pages/Analytics"))
import RequirePermission from "./frontend/components/global/RequirePermission"
// TODO: Re-enable when yourstop is ready - using placeholders for now
// New YourStop UI (converted from standalone Supabase/Next app) - mounted under /yourstop
// import YSHomePage from "../yourstop/frontend/src/app/page"
// import YSExplorePage from "../yourstop/frontend/src/app/explore/page"
// import YSRestaurantsPage from "../yourstop/frontend/src/app/restaurants/page"
// import YSRestaurantDetailPage from "../yourstop/frontend/src/app/restaurants/[id]/page"
// import YSBookingPage from "../yourstop/frontend/src/app/booking/page"
// import YSAuthPage from "../yourstop/frontend/src/app/auth/page"
// import YSMyBookingsPage from "../yourstop/frontend/src/app/my-bookings/page"
// import YSFavoritesPage from "../yourstop/frontend/src/app/favorites/page"
// import YSSearchPage from "../yourstop/frontend/src/app/search/page"
// import YSProfilePage from "../yourstop/frontend/src/app/profile/page"
// import YSProfileManagementPage from "../yourstop/frontend/src/app/profile-management/page"
// import YSAboutPage from "../yourstop/frontend/src/app/about/page"
// import YSContactPage from "../yourstop/frontend/src/app/contact/page"

// Placeholder components for YourStop pages
const YourStopLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="yourstop-app" style={{ minHeight: "100vh" }}>
    {children}
  </div>
)

const YSHomePage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">YourStop</h1><p>Coming soon...</p></div>;
const YSExplorePage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Explore</h1><p>Coming soon...</p></div>;
const YSRestaurantsPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Restaurants</h1><p>Coming soon...</p></div>;
const YSRestaurantDetailPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Restaurant Details</h1><p>Coming soon...</p></div>;
const YSBookingPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Booking</h1><p>Coming soon...</p></div>;
const YSAuthPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Authentication</h1><p>Coming soon...</p></div>;
const YSMyBookingsPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">My Bookings</h1><p>Coming soon...</p></div>;
const YSFavoritesPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Favorites</h1><p>Coming soon...</p></div>;
const YSSearchPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Search</h1><p>Coming soon...</p></div>;
const YSProfilePage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Profile</h1><p>Coming soon...</p></div>;
const YSProfileManagementPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Profile Management</h1><p>Coming soon...</p></div>;
const YSAboutPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">About</h1><p>Coming soon...</p></div>;
const YSContactPage = () => <div className="p-8 text-center"><h1 className="text-2xl font-bold mb-4">Contact</h1><p>Coming soon...</p></div>;

// Tools / secondary pages (heavy)
const FloorFriend = React.lazy(() => import("./frontend/pages/tools/FloorFriend"))
const PdfToExcelConverter = React.lazy(() => import("./frontend/pages/tools/PdfToExcelConverter"))
const ExcelToPdfConverter = React.lazy(() => import("./frontend/pages/tools/ExcelToPdfConverter"))
const ExcelReformat = React.lazy(() => import("./frontend/pages/tools/ExcelReformat"))
const SmokeTop3 = React.lazy(() => import("./frontend/pages/tools/SmokeTop3"))
const SmokeNext3 = React.lazy(() => import("./frontend/pages/tools/SmokeNext3"))
const AssistantContainer = React.lazy(() => import("./frontend/components/assistant/AssistantContainer"))
const ViewAllNotifications = React.lazy(() => import("./frontend/pages/notifications/ViewAllNotifications"))
const Supply = React.lazy(() => import("./frontend/pages/Supply"))
const ConnectSupplier = React.lazy(() => import("./frontend/pages/ConnectSupplier"))
// Legacy Stock CRUD pages removed from navigation; keep compatibility via redirects (see routes below).
const FinanceTest = React.lazy(() => import("./frontend/pages/finance/FinanceTest"))
const ContractView = React.lazy(() => import("./frontend/pages/ContractView"))
const PreorderPage = React.lazy(() => import("./frontend/pages/bookings/PreorderPage"))
const OAuthCallback = React.lazy(() => import("./frontend/pages/OAuthCallback"))
const HMRCOAuthCallback = React.lazy(() => import("./frontend/pages/hmrc/OAuthCallback"))
import BrandedAppLoader from "./frontend/components/global/BrandedAppLoader"
import AccountTerminated from "./frontend/pages/AccountTerminated"

const LEGACY_SEGMENT_MAP: Record<string, string> = {
  // Admin
  admin: "Admin",
  viewer: "Viewer",
  crm: "CRM",
  projects: "Projects",
  tasks: "Tasks",
  social: "Social",
  email: "Email",
  referrals: "Referrals",
  staff: "Staff",
  contracts: "Contracts",
  clients: "Clients",
  "company-viewer": "CompanyViewer",
  "create-company": "CreateCompany",
  "create-admin": "CreateAdmin",

  // YourStop
  explore: "Explore",
  restaurants: "Restaurants",
  booking: "Booking",
  auth: "Auth",
  "profile-management": "ProfileManagement",
  "my-bookings": "MyBookings",
  favorites: "Favorites",
  contact: "Contact",
  about: "About",
  search: "Search",
  profile: "Profile",

  // Misc
  "finance-test": "FinanceTest",
}

function pascalizeHyphenSegment(seg: string): string {
  return seg
    .split("-")
    .filter(Boolean)
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
    .join("")
}

function normalizeLegacyPathname(pathname: string): string {
  const parts = String(pathname || "")
    .split("/")
    .filter(Boolean)

  if (parts.length === 0) return "/"

  const normalized = parts.map((seg, idx) => {
    // Heuristic: don't mutate likely IDs (contain digits or non hyphen letters)
    const isLikelyId = idx > 0 && /[^a-zA-Z-]/.test(seg)
    if (isLikelyId) return seg

    const key = seg.toLowerCase()
    const mapped = LEGACY_SEGMENT_MAP[key]
    if (mapped) return mapped

    if (seg.includes("-")) return pascalizeHyphenSegment(seg)
    if (/[A-Z]/.test(seg)) return seg
    return seg.slice(0, 1).toUpperCase() + seg.slice(1)
  })

  return `/${normalized.join("/")}`
}

function LegacyRouteRedirect() {
  const location = useLocation()
  const nextPathname = normalizeLegacyPathname(location.pathname)
  const next = `${nextPathname}${location.search || ""}${location.hash || ""}`
  const cur = `${location.pathname}${location.search || ""}${location.hash || ""}`
  if (next === cur) return <Navigate to="/" replace />
  return <Navigate to={next} replace />
}

function kebabizeSegment(seg: string): string {
  if (!seg) return seg
  if (seg.includes("-")) return seg.toLowerCase()
  return seg
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase()
}

function YourStopLegacyRedirect() {
  const location = useLocation()
  const parts = String(location.pathname || "").split("/").filter(Boolean)
  if (parts.length === 0) return <Navigate to="/yourstop" replace />
  if (parts[0].toLowerCase() !== "yourstop") return <Navigate to="/yourstop" replace />

  const rest = parts.slice(1).map(kebabizeSegment).join("/")
  const nextPathname = `/yourstop${rest ? `/${rest}` : ""}`
  const next = `${nextPathname}${location.search || ""}${location.hash || ""}`
  return <Navigate to={next} replace />
}

function LegacyStockCrudRedirect({
  toPath,
  crudEntity,
  crudMode,
}: {
  toPath: string
  crudEntity: "product" | "stockCount" | "purchaseOrder" | "parLevel"
  crudMode: "create" | "edit" | "view"
}) {
  const { id } = useParams()
  const params = new URLSearchParams()
  params.set("crudEntity", crudEntity)
  params.set("crudMode", crudMode)
  if (id) params.set("id", id)
  return <Navigate to={`${toPath}?${params.toString()}`} replace />
}

function YourStopShellContent() {
  return (
    <Routes>
      {/* YourStop Routes - Customer Booking App (Completely Independent) */}
      <Route path="/yourstop" element={<YourStopLayout><YSHomePage /></YourStopLayout>} />

      {/* Back-compat redirect for old casing */}
      <Route path="/YourStop/*" element={<YourStopLegacyRedirect />} />

      {/* Canonical YourStop lowercase routes */}
      <Route path="/yourstop/explore" element={<YourStopLayout><YSExplorePage /></YourStopLayout>} />
      <Route path="/yourstop/restaurants" element={<YourStopLayout><YSRestaurantsPage /></YourStopLayout>} />
      <Route path="/yourstop/restaurants/:id" element={<YourStopLayout><YSRestaurantDetailPage /></YourStopLayout>} />
      <Route path="/yourstop/booking" element={<YourStopLayout><YSBookingPage /></YourStopLayout>} />
      <Route path="/yourstop/auth" element={<YourStopLayout><YSAuthPage /></YourStopLayout>} />
      <Route path="/yourstop/ProfileManagement" element={<YourStopLayout><YSProfileManagementPage /></YourStopLayout>} />
      <Route path="/yourstop/MyBookings" element={<YourStopLayout><YSMyBookingsPage /></YourStopLayout>} />
      <Route path="/yourstop/favorites" element={<YourStopLayout><YSFavoritesPage /></YourStopLayout>} />
      <Route path="/yourstop/contact" element={<YourStopLayout><YSContactPage /></YourStopLayout>} />
      <Route path="/yourstop/about" element={<YourStopLayout><YSAboutPage /></YourStopLayout>} />
      <Route path="/yourstop/search" element={<YourStopLayout><YSSearchPage /></YourStopLayout>} />
      <Route path="/yourstop/profile" element={<YourStopLayout><YSProfilePage /></YourStopLayout>} />

      {/* Fallback */}
      <Route path="/yourstop/*" element={<YourStopLayout><YSHomePage /></YourStopLayout>} />
      <Route path="/" element={<Navigate to="/yourstop" replace />} />
    </Routes>
  )
}

function MainAppContent() {
  const location = useLocation()
  const { state: companyState } = useCompany()
  const companyLayout = React.useMemo(
    () => getCompanyLayout(companyState?.company?.companyType),
    [companyState?.company?.companyType],
  )
  const bookingsEnabled = !companyLayout.disabledModules.has("bookings")
  const posEnabled = !companyLayout.disabledModules.has("pos")
  const supplyEnabled = companyLayout.enabledFeatures.has("supply")
  
  // Detect if device is mobile - this is critical to prevent loading heavy contexts on mobile
  const isMobileDevice = isMobilePhone()
  // Mobile/ESS routes are now handled at root level (main.tsx), not here
  const isYourStopRoute =
    location.pathname.startsWith("/YourStop") || location.pathname.startsWith("/yourstop")
  
  // Mobile/ESS routes are now handled at root level (main.tsx)
  // If mobile device and on app route, redirect to mobile (handled by DeviceRouter)
  
  // For mobile devices, skip LazyProviders to avoid loading heavy contexts
  // Mobile/ESS routes are now handled at root level (main.tsx), not here
  // YourStop routes are completely independent and should not load main app contexts
  if (isMobileDevice || isYourStopRoute) {
    return (
      <React.Suspense fallback={<BrandedAppLoader message="Loading..." />}>
        <Routes>
          {/* Loader preview route */}
          <Route path="/Loading" element={<BrandedAppLoader message="Loading preview..." />} />

          {/* Public routes */}
          <Route path="/Login" element={<Login />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/ResetPassword" element={<ResetPassword />} />
          <Route path="/Join" element={<Join />} />
          <Route path="/JoinCompany" element={<JoinCompany />} />
          <Route path="/AcceptSiteInvite" element={<AcceptSiteInvite />} />
          <Route path="/AccountTerminated" element={<AccountTerminated />} />
          <Route path="/AdminInvite/:inviteId" element={<AcceptAdminInvite />} />
          <Route path="/ConnectSupplier" element={<ConnectSupplier />} />
          {/* Legacy Staff route casing */}
          <Route path="/staff/*" element={<LegacyRouteRedirect />} />
          <Route path="/Staff/:uid" element={<StaffCardLanding />} />

          {/* Legacy Admin route casing/hyphens */}
          <Route path="/admin/*" element={<Navigate to="/Admin" replace />} />
          {/* Public preorder route */}
          <Route path="/Preorder/:companyId/:siteId/:bookingId" element={<PreorderPage />} />
          {/* OAuth callback routes */}
          <Route path="/OAuth/Callback/Gmail" element={<OAuthCallback />} />
          <Route path="/OAuth/Callback/Outlook" element={<OAuthCallback />} />
          <Route path="/OAuth/Callback/Lightspeed" element={<OAuthCallback />} />
          <Route path="/HMRC/Callback" element={<HMRCOAuthCallback />} />

          {/* Mobile/ESS Routes are now handled at root level (main.tsx), not here */}

          {/* YourStop is routed via the dedicated YourStop shell (outside MainAppContent). */}

          {/* Root route - device-based redirect */}
          <Route path="/" element={<DeviceRouter />} />
        </Routes>
      </React.Suspense>
    )
  }
  
  return (
    <LazyProviders>
          <>
            <React.Suspense fallback={<BrandedAppLoader message="Loading..." />}>
            <Routes>
              {/* Loader preview route */}
              <Route path="/Loading" element={<BrandedAppLoader message="Loading preview..." />} />

              {/* Public routes */}
              <Route path="/Login" element={<Login />} />
              <Route path="/Register" element={<Register />} />
              <Route path="/ResetPassword" element={<ResetPassword />} />
              <Route path="/Join" element={<Join />} />
              <Route path="/JoinCompany" element={<JoinCompany />} />
              <Route path="/EmployeeOnboarding" element={<EmployeeOnboarding />} />
              <Route path="/AcceptSiteInvite" element={<AcceptSiteInvite />} />
              <Route path="/AccountTerminated" element={<AccountTerminated />} />
              <Route path="/AdminInvite/:inviteId" element={<AcceptAdminInvite />} />
              <Route path="/ConnectSupplier" element={<ConnectSupplier />} />
              {/* Legacy Staff route casing */}
              <Route path="/staff/*" element={<LegacyRouteRedirect />} />
              <Route path="/Staff/:uid" element={<StaffCardLanding />} />
              {/* Public preorder route */}
              <Route path="/Preorder/:companyId/:siteId/:bookingId" element={<PreorderPage />} />
              {/* OAuth callback routes */}
              <Route path="/OAuth/Callback/Gmail" element={<OAuthCallback />} />
              <Route path="/OAuth/Callback/Outlook" element={<OAuthCallback />} />
              <Route path="/OAuth/Callback/Lightspeed" element={<OAuthCallback />} />
              <Route path="/HMRC/Callback" element={<HMRCOAuthCallback />} />

              {/* Mobile/ESS Routes are now handled at root level (main.tsx), not here */}
              {/* Admin Routes are now handled at root level (main.tsx), not here */}

              {/* App Routes (PC/Tablet) - Root level */}
              <Route path="/*" element={<ProtectedRoute element={<MainLayout />} />}>
                <Route index element={<Navigate to="Company" replace />} />
                <Route
                  path="Dashboard"
                  element={
                    <RequirePermission module="dashboard" page="dashboard">
                      <Dashboard />
                    </RequirePermission>
                  }
                />

                {/* Stock Routes */}
                <Route path="Stock" element={<Navigate to="/Stock/Items" replace />} />
                <Route
                  path="Stock/Items"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/PurchaseOrders"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/StockCounts"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/Transfers"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/ParLevels"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/Management/*"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/Reports"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/Order"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/Settings"
                  element={
                    <RequirePermission module="stock">
                      <StockDashboard />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/AddItem"
                  element={
                    <RequirePermission module="stock" page="items">
                      <Navigate to="/Stock/Items?crudEntity=product&crudMode=create" replace />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/AddStockCount"
                  element={
                    <RequirePermission module="stock" page="counts">
                      <Navigate to="/Stock/StockCounts?crudEntity=stockCount&crudMode=create" replace />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/EditStockCount/:id"
                  element={
                    <RequirePermission module="stock" page="counts">
                      <LegacyStockCrudRedirect toPath="/Stock/StockCounts" crudEntity="stockCount" crudMode="edit" />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/AddPurchase"
                  element={
                    <RequirePermission module="stock" page="orders">
                      <Navigate to="/Stock/PurchaseOrders?crudEntity=purchaseOrder&crudMode=create" replace />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/AddParLevel"
                  element={
                    <RequirePermission module="stock" page="counts">
                      <Navigate to="/Stock/ParLevels?crudEntity=parLevel&crudMode=create" replace />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/EditPurchase/:id"
                  element={
                    <RequirePermission module="stock" page="orders">
                      <LegacyStockCrudRedirect toPath="/Stock/PurchaseOrders" crudEntity="purchaseOrder" crudMode="edit" />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Stock/EditItem/:id"
                  element={
                    <RequirePermission module="stock" page="items">
                      <LegacyStockCrudRedirect toPath="/Stock/Items" crudEntity="product" crudMode="edit" />
                    </RequirePermission>
                  }
                />

                {/* Finance Routes */}
                <Route path="Finance" element={<Navigate to="/Finance/Dashboard" replace />} />
                <Route
                  path="Finance/*"
                  element={
                    <RequirePermission module="finance">
                      <Finance />
                    </RequirePermission>
                  }
                />
                <Route path="Finance-Test" element={<LegacyRouteRedirect />} />
                <Route path="FinanceTest" element={<FinanceTest />} />

                {/* Supply Routes (Supplier layout only) */}
                {supplyEnabled ? (
                  <>
                    <Route path="Supply" element={<Navigate to="/Supply/Dashboard" replace />} />
                    <Route path="Supply/*" element={<Supply />} />
                  </>
                ) : (
                  <>
                    <Route path="Supply" element={<Navigate to="/Dashboard" replace />} />
                    <Route path="Supply/*" element={<Navigate to="/Dashboard" replace />} />
                  </>
                )}

                {/* Company Routes */}
                <Route path="Company" element={<Navigate to="Company/Dashboard" replace />} />
                <Route
                  path="Company/*"
                  element={
                    <RequirePermission module="company">
                      <Company />
                    </RequirePermission>
                  }
                />
                <Route path="Company/Setup" element={<CompanySetup />} />
                <Route path="CreateCompany" element={<CreateCompany />} />

                {/* Tools Routes */}
                <Route path="Tools" element={<Temp />} />
                <Route path="Tools/FloorFriend" element={<FloorFriend />} />
                <Route path="Tools/PdfToExcel" element={<PdfToExcelConverter />} />
                <Route path="Tools/ExcelToPdf" element={<ExcelToPdfConverter />} />
                <Route path="Tools/ExcelReformat" element={<ExcelReformat />} />
                <Route path="Tools/SmokeTop3" element={<SmokeTop3 />} />
                <Route path="Tools/SmokeNext3" element={<SmokeNext3 />} />
                <Route path="Temp" element={<Temp />} />
                <Route path="Notifications" element={<ViewAllNotifications />} />

                {/* HR and Bookings Routes */}
                <Route path="HR" element={<Navigate to="/HR/Dashboard" replace />} />
                <Route
                  path="HR/*"
                  element={
                    <RequirePermission module="hr">
                      <HR />
                    </RequirePermission>
                  }
                />
                <Route path="Contract/:companyId/:siteId/:contractId" element={<ContractView />} />
                {bookingsEnabled ? (
                  <>
                    <Route path="Bookings" element={<Navigate to="/Bookings/Dashboard" replace />} />
                    <Route
                      path="Bookings/*"
                      element={
                        <RequirePermission module="bookings">
                          <Bookings />
                        </RequirePermission>
                      }
                    />
                  </>
                ) : (
                  <>
                    <Route path="Bookings" element={<Navigate to="/Dashboard" replace />} />
                    <Route path="Bookings/*" element={<Navigate to="/Dashboard" replace />} />
                  </>
                )}
                <Route
                  path="Messenger"
                  element={
                    <RequirePermission module="messenger">
                      <MessengerComponent />
                    </RequirePermission>
                  }
                />
                <Route
                  path="Messenger/*"
                  element={
                    <RequirePermission module="messenger">
                      <MessengerComponent />
                    </RequirePermission>
                  }
                />
                <Route path="Settings" element={<Navigate to="/Settings/Personal" replace />} />
                <Route path="Settings/*" element={<Settings />} />

                {/* POS Routes */}
                {posEnabled ? (
                  <>
                    <Route path="POS" element={<Navigate to="/POS/ItemSales" replace />} />
                    <Route
                      path="POS/TillScreen/Add"
                      element={
                        <RequirePermission module="pos" page="tillscreens">
                          <TillScreen />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="POS/TillScreen/Edit/:screenId"
                      element={
                        <RequirePermission module="pos" page="tillscreens">
                          <TillScreen />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="POS/TillUsage"
                      element={
                        <RequirePermission module="pos" page="usage">
                          <TillUsage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="POS/TillUsage/:screenId"
                      element={
                        <RequirePermission module="pos" page="usage">
                          <TillUsage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="POS/*"
                      element={
                        <RequirePermission module="pos">
                          <POS />
                        </RequirePermission>
                      }
                    />
                  </>
                ) : (
                  <>
                    <Route path="POS" element={<Navigate to="/Dashboard" replace />} />
                    <Route path="POS/*" element={<Navigate to="/Dashboard" replace />} />
                  </>
                )}

                {/* Analytics Routes */}
                <Route
                  path="Analytics"
                  element={
                    <RequirePermission module="dashboard" page="dashboard">
                      <Analytics />
                    </RequirePermission>
                  }
                />

              </Route>

              {/* Root route - device-based redirect */}
              <Route path="/" element={<DeviceRouter />} />
            </Routes>
            <AssistantContainer />
            </React.Suspense>
          </>
        </LazyProviders>
  )
}

function AppContent() {
  const location = useLocation()
  const path = location.pathname || ""

  // Lightweight shells: do NOT require CompanyProvider or main app module contexts.
  const isYourStopShell = path.startsWith("/yourstop") || path.startsWith("/YourStop")

  return (
    <>
      <AppInstallPrompt />
      {isYourStopShell ? <YourStopShellContent /> : <MainAppContent />}
    </>
  )
}

function App() {
  return (
    <CalculatorProvider>
      <AppContent />
    </CalculatorProvider>
  )
}

export default App