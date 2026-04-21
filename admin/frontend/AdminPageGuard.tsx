import React from "react";
import { Navigate } from "react-router-dom";
import { useAdmin } from "../backend/context/AdminContext";
import type { AdminPageKey } from "../backend/AdminAccess";
import { hasAdminPageAccess } from "../backend/AdminAccess";
import { GlobalLoader } from "../../app/backend/shared/GlobalLoader";

type Props = {
  page: AdminPageKey | AdminPageKey[];
  children: React.ReactNode;
  fallbackTo?: string;
};

// Admin router uses basename="/Admin", so internal navigation should not include "/Admin" prefix.
export default function AdminPageGuard({ page, children, fallbackTo = "/" }: Props) {
  const { state } = useAdmin();
  const user = state.user as any;

  // While auth/user is still loading, show global loader to prevent blank page.
  if (state.loading) return <GlobalLoader />;

  const hasAccess = Array.isArray(page)
    ? page.some((candidate) => hasAdminPageAccess(user, candidate))
    : hasAdminPageAccess(user, page);

  if (!hasAccess) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}
