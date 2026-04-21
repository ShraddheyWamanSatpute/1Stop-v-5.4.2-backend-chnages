export type AdminPageKey =
  | "dashboard"
  | "profile"
  | "viewer"
  | "crm"
  | "projects"
  | "tasks"
  | "calendar"
  | "integrations"
  | "social"
  | "email"
  | "referrals"
  | "staff"
  | "contracts"
  | "clients"
  | "companyViewer"
  | "createCompany"
  | "createAdmin"
  | "analytics"
  | "content"
  | "marketing"
  | "notes"
  | "qr"
  | "ops"
  | "reports";

export function isSuperAdminUser(user: any): boolean {
  return Boolean(user?.isAdmin);
}

export function isAdminStaffActive(user: any): boolean {
  return Boolean(user?.adminStaff?.active);
}

export function hasAdminPageAccess(user: any, page: AdminPageKey): boolean {
  // Super admins can access everything.
  if (isSuperAdminUser(user)) return true;

  // Internal admin staff must be explicitly enabled and granted.
  if (!isAdminStaffActive(user)) return false;

  // Dashboard + profile are always accessible so staff have a landing page and can edit their info.
  if (page === "dashboard" || page === "profile") return true;

  const pages =
    user?.adminStaff?.pages ??
    user?.adminStaff?.permissions?.pages ??
    user?.adminStaff?.permissions ??
    null;

  if (Array.isArray(pages)) {
    return pages.includes(page);
  }

  if (pages && typeof pages === "object") {
    const v = (pages as any)[page];
    if (typeof v === "boolean") return v;
    if (v && typeof v === "object" && typeof (v as any).view === "boolean") return Boolean((v as any).view);
  }

  return false;
}
