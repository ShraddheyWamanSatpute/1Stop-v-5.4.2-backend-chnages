/**
 * ESS Loading Screen - Re-export from shared GlobalLoader
 * This file exists for backward compatibility.
 * All loading components should use the shared GlobalLoader from app/shared/GlobalLoader.tsx
 */

"use client"

export { GlobalLoader as default, GlobalLoader as ESSLoadingScreen } from "../../../app/backend/shared/GlobalLoader";