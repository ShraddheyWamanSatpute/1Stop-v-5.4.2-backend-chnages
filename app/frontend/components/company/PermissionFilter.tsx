import React from "react";
import { useCompany } from "../../../backend/context/CompanyContext";

interface PermissionFilterProps {
  module: string;
  page?: string;
  action: "view" | "edit" | "delete";
  role?: string;
  department?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionFilter - A component that conditionally renders its children based on user permissions
 * 
 * @param module - The module to check permissions for
 * @param page - Optional page within the module to check permissions for
 * @param action - The action to check permissions for (view, edit, delete)
 * @param role - Optional role override to check against (defaults to user's role)
 * @param department - Optional department override to check against (defaults to user's department)
 * @param children - The content to render if the user has permission
 * @param fallback - Optional content to render if the user doesn't have permission
 */
export const PermissionFilter: React.FC<PermissionFilterProps> = ({
  module,
  page,
  action,
  role,
  department,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useCompany();
  
  // Check if the user has permission for the specified module, page, and action
  const hasAccess = hasPermission(module, page || "", action, role, department);
  
  // Render children if the user has permission, otherwise render the fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * ViewPermission - A specialized PermissionFilter for view actions
 */
export const ViewPermission: React.FC<Omit<PermissionFilterProps, "action">> = (props) => {
  return <PermissionFilter {...props} action="view" />;
};

/**
 * EditPermission - A specialized PermissionFilter for edit actions
 */
export const EditPermission: React.FC<Omit<PermissionFilterProps, "action">> = (props) => {
  return <PermissionFilter {...props} action="edit" />;
};

/**
 * DeletePermission - A specialized PermissionFilter for delete actions
 */
export const DeletePermission: React.FC<Omit<PermissionFilterProps, "action">> = (props) => {
  return <PermissionFilter {...props} action="delete" />;
};

export default PermissionFilter;
