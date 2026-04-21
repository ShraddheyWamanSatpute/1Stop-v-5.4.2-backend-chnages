/**
 * BrandedAppLoader - Re-export from shared GlobalLoader
 * This file exists for backward compatibility.
 * All loading components should use the shared GlobalLoader from app/shared/GlobalLoader.tsx
 */

export { GlobalLoader as default, GlobalLoader as BrandedAppLoader } from "../../app/backend/shared/GlobalLoader";
