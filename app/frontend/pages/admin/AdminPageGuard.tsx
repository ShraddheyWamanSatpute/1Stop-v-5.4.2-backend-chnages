import React from "react";
import { Navigate } from "react-router-dom";
import { useSettings } from "../../../backend/context/SettingsContext";
import type { AdminPageKey } from "./AdminAccess";
import { hasAdminPageAccess } from "./AdminAccess";

type Props = {
  page: AdminPageKey;
  children: React.ReactNode;
  fallbackTo?: string;
};

export default function AdminPageGuard({ page, children, fallbackTo = "/Admin" }: Props) {
  const { state: settingsState } = useSettings();
  const user = settingsState.user as any;

  // While auth/user is still loading, avoid redirect flicker.
  if (settingsState.loading) return null;

  if (!hasAdminPageAccess(user, page)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}

