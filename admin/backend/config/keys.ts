// Re-export keys from root keys.ts
// Admin uses main app keys (APP_KEYS) plus any admin-specific extras
import { ADMIN_KEYS as ADMIN_KEYS_IMPORT, getFunctionsBaseUrl, getFunctionsFetchBaseUrl, FUNCTION_KEYS } from "../../../app/backend/config/keys"
export type { AppKeysShape as AdminKeysShape, FirebaseKeys, StripeKeys } from "../../../app/backend/config/keys"

// Export ADMIN_KEYS
export const ADMIN_KEYS = ADMIN_KEYS_IMPORT

// Alias for backward compatibility
export const APP_KEYS = ADMIN_KEYS
export { getFunctionsBaseUrl, getFunctionsFetchBaseUrl, FUNCTION_KEYS }
export default APP_KEYS
