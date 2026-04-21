/**
 * Debug utility to help diagnose employee loading issues
 */

export interface DebugInfo {
  companyContext: {
    companyID: string | null;
    selectedSiteID: string | null;
    selectedSubsiteID: string | null;
    sites: any[] | null;
  };
  hrPaths: string[];
  employeeData: {
    totalEmployees: number;
    employeesByPath: Record<string, number>;
    employeesPreview: any[];
  };
  issues: string[];
  recommendations: string[];
}

/**
 * Debug employee loading issues
 */
export async function debugEmployeeLoading(): Promise<DebugInfo> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Get company context info (this would need to be called from a component with context access)
  const companyContext = {
    companyID: localStorage.getItem('companyID') || null,
    selectedSiteID: localStorage.getItem('selectedSiteID') || null,
    selectedSubsiteID: localStorage.getItem('selectedSubsiteID') || null,
    sites: null // Would need to get from context
  };
  
  console.log("🔍 Debug - Company Context:", companyContext);
  
  // Generate expected HR paths
  const hrPaths: string[] = [];
  
  if (companyContext.companyID) {
    const companyRoot = `companies/${companyContext.companyID}`;
    
    if (companyContext.selectedSiteID) {
      if (companyContext.selectedSubsiteID) {
        // Subsite level
        hrPaths.push(`${companyRoot}/sites/${companyContext.selectedSiteID}/subsites/${companyContext.selectedSubsiteID}/data/hr`);
      }
      // Site level
      hrPaths.push(`${companyRoot}/sites/${companyContext.selectedSiteID}/data/hr`);
    }
    // Company level
    hrPaths.push(`${companyRoot}/data/hr`);
  }
  
  console.log("🔍 Debug - Expected HR Paths:", hrPaths);
  
  // Check for common issues
  if (!companyContext.companyID) {
    issues.push("No company ID found - user may not be logged in or company not selected");
    recommendations.push("Ensure user is logged in and has selected a company");
  }
  
  if (hrPaths.length === 0) {
    issues.push("No HR paths generated - company context is incomplete");
    recommendations.push("Check CompanyContext initialization and company selection");
  }
  
  if (!companyContext.selectedSiteID) {
    issues.push("No site selected - may be looking at company level only");
    recommendations.push("Select a site to access site-specific employee data");
  }
  
  // Mock employee data check (would need Firebase access in real implementation)
  const employeeData = {
    totalEmployees: 0,
    employeesByPath: {} as Record<string, number>,
    employeesPreview: []
  };
  
  // Add recommendations based on findings
  if (issues.length === 0) {
    recommendations.push("Company context looks good - check Firebase database for employee data");
    recommendations.push("Verify employees exist at paths: " + hrPaths.join(", "));
  }
  
  return {
    companyContext,
    hrPaths,
    employeeData,
    issues,
    recommendations
  };
}

/**
 * Log debug information to console
 */
export function logEmployeeDebugInfo(debugInfo: DebugInfo): void {
  console.log("🔍 Employee Loading Debug Report");
  console.log("================================");
  
  console.log("\n📊 Company Context:");
  console.log(`Company ID: ${debugInfo.companyContext.companyID || 'NOT SET'}`);
  console.log(`Site ID: ${debugInfo.companyContext.selectedSiteID || 'NOT SET'}`);
  console.log(`Subsite ID: ${debugInfo.companyContext.selectedSubsiteID || 'NOT SET'}`);
  
  console.log("\n📂 HR Paths:");
  if (debugInfo.hrPaths.length > 0) {
    debugInfo.hrPaths.forEach((path, index) => {
      console.log(`${index + 1}. ${path}`);
    });
  } else {
    console.log("❌ No HR paths generated");
  }
  
  console.log("\n👥 Employee Data:");
  console.log(`Total Employees: ${debugInfo.employeeData.totalEmployees}`);
  
  if (debugInfo.issues.length > 0) {
    console.log("\n⚠️ Issues Found:");
    debugInfo.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  if (debugInfo.recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    debugInfo.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
}

/**
 * Quick debug function to run in browser console
 */
export async function quickEmployeeDebug(): Promise<void> {
  try {
    const debugInfo = await debugEmployeeLoading();
    logEmployeeDebugInfo(debugInfo);
    
    // Additional browser-specific checks
    console.log("\n🌐 Browser Storage:");
    console.log("localStorage keys:", Object.keys(localStorage));
    console.log("sessionStorage keys:", Object.keys(sessionStorage));
    
    // Check if user is authenticated
    const authState = localStorage.getItem('authState');
    console.log("Auth state:", authState ? 'Found' : 'Not found');
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).quickEmployeeDebug = quickEmployeeDebug;
  console.log("💡 Run 'quickEmployeeDebug()' in console to debug employee loading");
}
