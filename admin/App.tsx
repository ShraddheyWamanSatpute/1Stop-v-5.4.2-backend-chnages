import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { GlobalLoader } from "../app/backend/shared/GlobalLoader";
import AdminInstallPrompt from "./frontend/components/AdminInstallPrompt";

const AdminLogin = React.lazy(() => import("./frontend/AdminLogin"));
const AdminRegister = React.lazy(() => import("./frontend/AdminRegister"));

const AdminLayout = React.lazy(() => import("./frontend/AdminLayout"));
const AdminDashboard = React.lazy(() => import("./frontend/AdminDashboard"));
const AdminViewMode = React.lazy(() => import("./frontend/AdminViewMode"));
const AdminCRM = React.lazy(() => import("./frontend/AdminCRM"));
const AdminTasks = React.lazy(() => import("./frontend/AdminTasks"));
const AdminEmail = React.lazy(() => import("./frontend/AdminEmail"));
const AdminIntegrations = React.lazy(() => import("./frontend/AdminIntegrations"));
const AdminReferrals = React.lazy(() => import("./frontend/AdminReferrals"));
const AdminStaff = React.lazy(() => import("./frontend/AdminStaff"));
const AdminCalendarFull = React.lazy(() => import("./frontend/calendar/Full"));
const AdminProfile = React.lazy(() => import("./frontend/AdminProfile"));
const AdminAnalytics = React.lazy(() => import("./frontend/analytics/Analytics"));
const AdminComms = React.lazy(() => import("./frontend/AdminComms"));
const AdminOps = React.lazy(() => import("./frontend/AdminOps"));
const AdminReports = React.lazy(() => import("./frontend/AdminReports"));

const AdminPageGuard = React.lazy(() => import("./frontend/AdminPageGuard"));
const AdminProtectedRoute = React.lazy(() => import("./backend/functions/AdminProtectedRoute"));

const QRLandingPage = React.lazy(() => import("./frontend/qr/Landing"));
const QRFormPage = React.lazy(() => import("./frontend/qr/Form"));

const OAuthCallback = React.lazy(() => import("../app/frontend/pages/OAuthCallback"));
const HMRCOAuthCallback = React.lazy(() => import("../app/frontend/pages/hmrc/OAuthCallback"));
const AcceptAdminInvite = React.lazy(() => import("../app/frontend/pages/AcceptAdminInvite"));
const ResetPassword = React.lazy(() => import("../app/frontend/pages/ResetPassword"));

function App() {
  return (
    <>
      <AdminInstallPrompt />
      <React.Suspense fallback={<GlobalLoader />}>
      <Routes>
        {/* Admin auth routes */}
        <Route path="/AdminLogin" element={<AdminLogin />} />
        <Route path="/AdminRegister" element={<AdminRegister />} />
        <Route path="/ResetPassword" element={<ResetPassword />} />
        <Route path="/AdminInvite/:inviteId" element={<AcceptAdminInvite />} />

        {/* OAuth callback routes (used by Admin email/calendar) */}
        <Route path="/OAuth/Callback/Gmail" element={<OAuthCallback />} />
        <Route path="/OAuth/Callback/Outlook" element={<OAuthCallback />} />
        <Route path="/OAuth/Callback/Lightspeed" element={<OAuthCallback />} />
        <Route path="/HMRC/Callback" element={<HMRCOAuthCallback />} />

        {/* Public QR routes */}
        <Route path="/Qr/:adminId" element={<QRLandingPage />} />
        <Route path="/QrForm" element={<QRFormPage />} />

        {/* Admin Routes */}
        <Route path="/*" element={<AdminProtectedRoute element={<AdminLayout />} />}>
          <Route
            index
            element={
              <AdminPageGuard page="dashboard">
                <AdminDashboard />
              </AdminPageGuard>
            }
          />
          <Route
            path="Viewer"
            element={
              <AdminPageGuard page="viewer">
                <AdminViewMode />
              </AdminPageGuard>
            }
          />
          <Route
            path="CRM/*"
            element={
              <AdminPageGuard page="crm">
                <AdminCRM />
              </AdminPageGuard>
            }
          />
          <Route path="Projects" element={<Navigate to="/Tasks/Projects" replace />} />
          <Route
            path="Tasks/*"
            element={
              <AdminPageGuard page="tasks">
                <AdminTasks />
              </AdminPageGuard>
            }
          />
          <Route
            path="Calendar"
            element={
              <AdminPageGuard page="calendar">
                <AdminCalendarFull />
              </AdminPageGuard>
            }
          />
          <Route path="Social" element={<Navigate to="/Marketing/Social" replace />} />
          <Route path="Content" element={<Navigate to="/Marketing/Content" replace />} />
          <Route
            path="Integrations/*"
            element={
              <AdminPageGuard page="integrations">
                <AdminIntegrations />
              </AdminPageGuard>
            }
          />
          <Route
            path="Email"
            element={
              <AdminPageGuard page="email">
                <AdminEmail />
              </AdminPageGuard>
            }
          />
          <Route
            path="Referrals"
            element={
              <AdminPageGuard page="referrals">
                <AdminReferrals />
              </AdminPageGuard>
            }
          />
          <Route path="Staff" element={<Navigate to="/Staff/Employees" replace />} />
          <Route
            path="Staff/*"
            element={
              <AdminPageGuard page="staff">
                <AdminStaff />
              </AdminPageGuard>
            }
          />
          <Route
            path="Profile"
            element={
              <AdminPageGuard page="profile">
                <AdminProfile />
              </AdminPageGuard>
            }
          />
          <Route
            path="Analytics"
            element={
              <AdminPageGuard page="analytics">
                <AdminAnalytics />
              </AdminPageGuard>
            }
          />
          <Route
            path="Marketing/*"
            element={
              <AdminPageGuard page={["marketing", "social", "content"]}>
                <AdminComms />
              </AdminPageGuard>
            }
          />
          <Route
            path="Ops"
            element={
              <AdminPageGuard page="ops">
                <AdminOps />
              </AdminPageGuard>
            }
          />
          <Route
            path="Reports"
            element={
              <AdminPageGuard page="reports">
                <AdminReports />
              </AdminPageGuard>
            }
          />
          <Route path="Notes" element={<Navigate to="/Tasks/Notes" replace />} />
          <Route path="QR" element={<Navigate to="/CRM/QR" replace />} />
          <Route path="Contracts" element={<Navigate to="/CRM/Companies" replace />} />
          <Route path="Clients" element={<Navigate to="/CRM/Clients" replace />} />
          <Route path="CompanyViewer" element={<Navigate to="/Viewer" replace />} />
          <Route path="CreateCompany" element={<Navigate to="/CRM/Companies" replace />} />
          <Route path="CreateAdmin" element={<Navigate to="/Staff/Employees" replace />} />
        </Route>
      </Routes>
      </React.Suspense>
    </>
  );
}

export default App;
