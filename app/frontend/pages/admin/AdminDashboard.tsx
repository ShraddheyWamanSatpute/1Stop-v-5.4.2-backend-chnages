import React, { useMemo } from "react";
import { Box, Typography, Grid, Card, CardContent, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Business as BusinessIcon,
  Visibility as ViewIcon,
  Assignment as TasksIcon,
  CalendarMonth as CalendarIcon,
  Contacts as CRMIcon,
  SupportAgent as SupportIcon,
  Campaign as SocialIcon,
  Email as EmailIcon,
  QrCode2 as QrIcon,
  AdminPanelSettings as StaffIcon,
} from "@mui/icons-material";
import { useSettings } from "../../../backend/context/SettingsContext";
import type { AdminPageKey } from "./AdminAccess";
import { hasAdminPageAccess } from "./AdminAccess";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();
  const user = settingsState.user as any;

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
      path: "/Admin/Viewer",
      color: "info",
    },
    {
      key: "crm",
      title: "CRM",
      description: "Contacts, clients, and staff contacts",
      icon: <CRMIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/CRM",
      color: "primary",
    },
    {
      key: "tasks",
      title: "Tasks",
      description: "Task tracking (optionally linked to projects)",
      icon: <TasksIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/Tasks",
      color: "success",
    },
    {
      key: "calendar",
      title: "Calendar",
      description: "Task calendar + Google/Outlook sync",
      icon: <CalendarIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/Calendar",
      color: "primary",
    },
    {
      key: "social",
      title: "Social",
      description: "Queue and schedule social posts (multi-platform)",
      icon: <SocialIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/Social",
      color: "secondary",
    },
    {
      key: "email",
      title: "Email",
      description: "Unified inbox + reply drafting (Gmail/Outlook)",
      icon: <EmailIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/Email",
      color: "primary",
    },
    {
      key: "referrals",
      title: "Referrals",
      description: "Staff intro QR codes → save contacts + add to CRM",
      icon: <QrIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/Referrals",
      color: "info",
    },
    {
      key: "staff",
      title: "Staff",
      description: "Invites, permissions, and admin creation",
      icon: <StaffIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/Staff",
      color: "warning",
    },
    {
      key: "createCompany",
      title: "Companies",
      description: "View, create, edit and manage companies",
      icon: <BusinessIcon sx={{ fontSize: 48 }} />,
      path: "/Admin/CreateCompany",
      color: "primary",
    },
  ];

  const visibleFeatures = useMemo(() => {
    // Always show dashboard tiles only if user can access them.
    return adminFeatures.filter((f) => hasAdminPageAccess(user, f.key));
  }, [user]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Admin tools for managing the platform.
      </Typography>

      <Grid container spacing={3}>
        {visibleFeatures.map((feature) => (
          <Grid item xs={12} sm={6} md={3} key={feature.title}>
            {/**
             * Guard against invalid palette keys (can crash MUI styles).
             */}
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
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(feature.path)}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                <Box sx={{ color: `${safeColor}.main`, mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
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
    </Box>
  );
};

export default AdminDashboard;
