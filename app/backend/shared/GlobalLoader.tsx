/**
 * Global Loading Component
 * 
 * Shared loading component used across all sections (admin, app, mobile, main-site).
 * Ensures consistent loading experience throughout the application.
 * 
 * Location: app/shared/GlobalLoader.tsx (same level as KeyVault.ts for consistency)
 */

import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { themeConfig } from "../context/AppTheme";

interface GlobalLoaderProps {
  message?: string;
  children?: React.ReactNode;
  variant?: "fullscreen" | "inline";
}

/**
 * Global Loader Component
 * 
 * Displays a branded loading screen with logo and spinner.
 * Used as the default loading component across all application sections.
 * 
 * @param message - Optional custom loading message (default: "Loading 1Stop...")
 * @param children - Optional additional content to display
 * @param variant - Display variant: "fullscreen" (fixed overlay) or "inline" (fits container)
 */
export const GlobalLoader: React.FC<GlobalLoaderProps> = ({ 
  message: _message = "Loading 1Stop...",
  children,
  variant = "fullscreen"
}) => {
  void _message;
  const displayMessage = "Loading 1Stop...";
  const containerStyles = variant === "fullscreen" 
    ? {
        position: "fixed" as const,
        inset: 0,
        zIndex: 20000,
      }
    : {
        position: "relative" as const,
        width: "100%",
        height: "100%",
        minHeight: "400px",
      };

  return (
    <Box
      sx={{
        ...containerStyles,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Match the app's top bar color exactly when fullscreen
        bgcolor: variant === "fullscreen" ? themeConfig.components.header.backgroundColor : "background.default",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Box sx={{ position: "relative", width: 140, height: 140 }}>
          {/* Center logo */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Box
              component="img"
              src="/images/logo.png"
              alt="1 Stop"
              sx={{
                width: 96,
                height: 96,
                objectFit: "contain",
                borderRadius: 0,
                boxShadow: "none",
                opacity: 0.92,
              }}
            />
          </Box>

          {/* Spinner ring (render above logo) */}
          <CircularProgress
            size={140}
            thickness={3.5}
            disableShrink
            sx={{
              color: variant === "fullscreen" 
                ? themeConfig.brandColors.offWhite
                : themeConfig.brandColors.navy,
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 2,
              animationDuration: "1.8s",
              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }}
          />
        </Box>

        <Typography
          variant="h6"
          sx={{
            mt: 1,
            color: variant === "fullscreen" 
              ? themeConfig.brandColors.offWhite
              : themeConfig.brandColors.navy,
            fontWeight: 600,
            letterSpacing: 0.2,
            textAlign: "center",
          }}
        >
          {displayMessage}
        </Typography>

        {children}
      </Box>
    </Box>
  );
};

/**
 * Default export for convenience
 */
export default GlobalLoader;
