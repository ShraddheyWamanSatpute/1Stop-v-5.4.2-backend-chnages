import React from "react";
import { alpha } from "@mui/material/styles";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { themeConfig } from "../../../app/backend/context/AppTheme";

export type AdminPageMetric = {
  label: string;
  value: React.ReactNode;
  helperText?: string;
  icon?: React.ReactNode;
};

type AdminPageShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  metrics?: AdminPageMetric[];
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
};

type AdminSectionCardProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  flush?: boolean;
};

export function AdminPageShell({
  children,
  sx,
}: AdminPageShellProps) {
  return (
    <Box
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          gap: 0,
          minHeight: 0,
          flex: 1,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export function AdminSectionCard({
  title,
  description,
  actions,
  children,
  sx,
  contentSx,
  flush = false,
}: AdminSectionCardProps) {
  return (
    <Paper
      elevation={0}
      sx={[
        {
          borderRadius: 2,
          border: "1px solid",
          borderColor: alpha(themeConfig.brandColors.navy, 0.1),
          bgcolor: "background.paper",
          boxShadow: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {title || description || actions ? (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box>
            {title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
            ) : null}
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions ? <Box sx={{ width: { xs: "100%", md: "auto" } }}>{actions}</Box> : null}
        </Stack>
      ) : null}

      <Box
        sx={[
          {
            p: flush ? 0 : { xs: 1.5, md: 2 },
            minHeight: 0,
            flex: 1,
          },
          ...(Array.isArray(contentSx) ? contentSx : [contentSx]),
        ]}
      >
        {children}
      </Box>
    </Paper>
  );
}
