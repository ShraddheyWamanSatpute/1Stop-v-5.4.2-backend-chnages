import { useCompany } from "../../backend/context/CompanyContext";

/**
 * Custom hook for checking user permissions
 * 
 * @returns Object with permission checking functions
 */
export const usePermission = () => {
  const { hasPermission } = useCompany();
  
  /**
   * Check if the user has permission to view a module/page
   * 
   * @param module - The module to check permissions for
   * @param page - Optional page within the module
   * @param role - Optional role override (defaults to user's role)
   * @param department - Optional department override (defaults to user's department)
   * @returns boolean indicating if the user has view permission
   */
  const canView = (module: string, page?: string, role?: string, department?: string): boolean => {
    return hasPermission(module, page || "", "view", role, department);
  };
  
  /**
   * Check if the user has permission to edit a module/page
   * 
   * @param module - The module to check permissions for
   * @param page - Optional page within the module
   * @param role - Optional role override (defaults to user's role)
   * @param department - Optional department override (defaults to user's department)
   * @returns boolean indicating if the user has edit permission
   */
  const canEdit = (module: string, page?: string, role?: string, department?: string): boolean => {
    return hasPermission(module, page || "", "edit", role, department);
  };
  
  /**
   * Check if the user has permission to delete in a module/page
   * 
   * @param module - The module to check permissions for
   * @param page - Optional page within the module
   * @param role - Optional role override (defaults to user's role)
   * @param department - Optional department override (defaults to user's department)
   * @returns boolean indicating if the user has delete permission
   */
  const canDelete = (module: string, page?: string, role?: string, department?: string): boolean => {
    return hasPermission(module, page || "", "delete", role, department);
  };
  
  return {
    canView,
    canEdit,
    canDelete,
    hasPermission,
  };
};

export default usePermission;
