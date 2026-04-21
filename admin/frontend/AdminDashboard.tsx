import React, { useMemo } from "react";
import { alpha } from "@mui/material/styles";
import { Box, Typography, Grid, Card, CardContent, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Assignment as TasksIcon,
  CalendarMonth as CalendarIcon,
  Contacts as CRMIcon,
  SupportAgent as SupportIcon,
  Campaign as SocialIcon,
  Email as EmailIcon,
  QrCode2 as QrIcon,
  AdminPanelSettings as StaffIcon,
  Analytics as AnalyticsIcon,
  IntegrationInstructions as IntegrationIcon,
  Schedule as ContentIcon,
  Campaign as MarketingIcon,
  NoteAlt as NotesIcon,
  QrCode as QRIcon,
  Build as OpsIcon,
  BugReport as ReportsIcon,
} from "@mui/icons-material";
import { useAdmin } from "../backend/context/AdminContext";
import type { AdminPageKey } from "../backend/AdminAccess";
import { hasAdminPageAccess } from "../backend/AdminAccess";
import { themeConfig } from "../../app/backend/context/AppTheme";
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useAdmin();
  const user = state.user as any;

  const adminFeatures: Array<{
    key: AdminPageKey;
    title: string;
    description: string;
    icon: any;
    path: string;
    color: any;
  }> = [
    {
      key: "viewer",
      title: "View Mode",
      description: "Customer service window to view the main app (fullscreen supported)",
      icon: <SupportIcon sx={{ fontSize: 48 }} />,
      path: "/Viewer",
      color: "info",
    },
    {
      key: "crm",
      title: "CRM",
      description: "Contacts, clients, and staff contacts",
      icon: <CRMIcon sx={{ fontSize: 48 }} />,
      path: "/CRM",
      color: "primary",
    },
    {
      key: "tasks",
      title: "Tasks",
      description: "Task tracking (optionally linked to projects)",
      icon: <TasksIcon sx={{ fontSize: 48 }} />,
      path: "/Tasks",
      color: "success",
    },
    {
      key: "calendar",
      title: "Calendar",
      description: "Task calendar + Google/Outlook sync",
      icon: <CalendarIcon sx={{ fontSize: 48 }} />,
      path: "/Calendar",
      color: "primary",
    },
    {
      key: "integrations",
      title: "Integrations",
      description: "Manage external integration credentials, previews, and sync activity",
      icon: <IntegrationIcon sx={{ fontSize: 48 }} />,
      path: "/Integrations/Dashboard",
      color: "info",
    },
    {
      key: "social",
      title: "Social",
      description: "Queue and schedule social posts (multi-platform)",
      icon: <SocialIcon sx={{ fontSize: 48 }} />,
      path: "/Social",
      color: "secondary",
    },
    {
      key: "email",
      title: "Email",
      description: "Unified inbox + reply drafting (Gmail/Outlook)",
      icon: <EmailIcon sx={{ fontSize: 48 }} />,
      path: "/Email",
      color: "primary",
    },
    {
      key: "referrals",
      title: "Referrals",
      description: "Staff intro QR codes → save contacts + add to CRM",
      icon: <QrIcon sx={{ fontSize: 48 }} />,
      path: "/Referrals",
      color: "info",
    },
    {
      key: "staff",
      title: "Staff",
      description: "Invites, permissions, and admin creation",
      icon: <StaffIcon sx={{ fontSize: 48 }} />,
      path: "/Staff/Employees",
      color: "warning",
    },
    {
      key: "createCompany",
      title: "Companies",
      description: "View, create, edit and manage companies",
      icon: <BusinessIcon sx={{ fontSize: 48 }} />,
      path: "/CreateCompany",
      color: "primary",
    },
    {
      key: "analytics",
      title: "Analytics",
      description: "Analytics dashboard with sales, leads, and marketing metrics",
      icon: <AnalyticsIcon sx={{ fontSize: 48 }} />,
      path: "/Analytics",
      color: "info",
    },
    {
      key: "content",
      title: "Content Schedule",
      description: "Schedule and manage social media content posts",
      icon: <ContentIcon sx={{ fontSize: 48 }} />,
      path: "/Content",
      color: "secondary",
    },
    {
      key: "marketing",
      title: "Marketing",
      description: "Manage marketing campaigns and events",
      icon: <MarketingIcon sx={{ fontSize: 48 }} />,
      path: "/Marketing",
      color: "warning",
    },
    {
      key: "notes",
      title: "Notes",
      description: "Create and manage notes for meetings, leads, and strategy",
      icon: <NotesIcon sx={{ fontSize: 48 }} />,
      path: "/Notes",
      color: "success",
    },
    {
      key: "qr",
      title: "QR Codes",
      description: "Generate personal and generic QR codes for networking",
      icon: <QRIcon sx={{ fontSize: 48 }} />,
      path: "/QR",
      color: "primary",
    },
    {
      key: "ops",
      title: "Ops",
      description: "Environment status, versions and health checks",
      icon: <OpsIcon sx={{ fontSize: 48 }} />,
      path: "/Ops",
      color: "info",
    },
    {
      key: "reports",
      title: "Reports",
      description: "Review bug reports submitted from the main app",
      icon: <ReportsIcon sx={{ fontSize: 48 }} />,
      path: "/Reports",
      color: "error",
    },
  ];

  const visibleFeatures = useMemo(() => {
    // Always show dashboard tiles only if user can access them.
    return adminFeatures.filter((f) => hasAdminPageAccess(user, f.key));
  }, [user]);

  const supportFeatureCount = visibleFeatures.filter((feature) =>
    ["viewer", "referrals", "staff", "ops", "analytics", "reports"].includes(feature.key),
  ).length;

  const workflowFeatureCount = visibleFeatures.filter((feature) =>
    ["crm", "tasks", "calendar", "integrations", "email", "marketing", "social", "content", "notes"].includes(feature.key),
  ).length;

  return (
    <AdminPageShell
      title="Admin workspace"
      description="Everything on the admin side now runs through the same 1Stop visual system, with clearer navigation cards for the upgraded CRM, operations, support, and communications tools."
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Button
            variant="contained"
            onClick={() => navigate(visibleFeatures[0]?.path || "/")}
            sx={{
              bgcolor: themeConfig.brandColors.offWhite,
              color: themeConfig.brandColors.navy,
              "&:hover": { bgcolor: alpha(themeConfig.brandColors.offWhite, 0.92) },
            }}
          >
            Open workspace
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate("/Viewer")}
            sx={{
              color: themeConfig.brandColors.offWhite,
              borderColor: alpha(themeConfig.brandColors.offWhite, 0.35),
              "&:hover": { borderColor: themeConfig.brandColors.offWhite, bgcolor: alpha(themeConfig.brandColors.offWhite, 0.08) },
            }}
          >
            Support view
          </Button>
        </Stack>
      }
      metrics={[
        { label: "Accessible pages", value: visibleFeatures.length, icon: <DashboardIcon fontSize="small" /> },
        { label: "Workflow hubs", value: workflowFeatureCount, icon: <TasksIcon fontSize="small" /> },
        { label: "Support tools", value: supportFeatureCount, icon: <SupportIcon fontSize="small" /> },
      ]}
    >
      <AdminSectionCard flush contentSx={{ p: { xs: 1.5, md: 2 } }}>
        <Grid container spacing={2}>
          {visibleFeatures.map((feature) => (
            <Grid item xs={12} sm={6} xl={3} key={feature.title}>
              {(() => {
                const allowedColors = ["primary", "secondary", "success", "info", "warning", "error"] as const;
                const safeColor = (allowedColors as readonly string[]).includes(String(feature.color))
                  ? (feature.color as (typeof allowedColors)[number])
                  : "primary";
                return (
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: alpha(themeConfig.brandColors.navy, 0.1),
                      boxShadow: "0 12px 28px rgba(23, 35, 78, 0.08)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 20px 36px rgba(23, 35, 78, 0.12)",
                        borderColor: alpha(themeConfig.brandColors.navy, 0.22),
                      },
                    }}
                    onClick={() => navigate(feature.path)}
                  >
                    <CardContent sx={{ flexGrow: 1, textAlign: "left", p: 2.25 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: `${safeColor}.main`,
                          bgcolor: alpha(themeConfig.brandColors.navy, 0.05),
                          mb: 2,
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2.25, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color={safeColor}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(feature.path);
                        }}
                      >
                        Open
                      </Button>
                    </Box>
                  </Card>
                );
              })()}
            </Grid>
          ))}
        </Grid>
      </AdminSectionCard>
    </AdminPageShell>
  );
};

export default AdminDashboard;
