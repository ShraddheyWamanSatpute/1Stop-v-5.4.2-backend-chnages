// KeyVault is now a thin compatibility layer that re-exports the repo-wide
// build-time env driven configuration from `keys.ts`.
//
// Many parts of the app import `APP_KEYS` / `getFunctionsBaseUrl` from here.
// Keeping this file avoids wide refactors while ensuring dev/prod can be split
// safely by build environment.

export {
  APP_KEYS,
  FUNCTION_KEYS,
  FIREBASE_CONFIGS,
  getFunctionsBaseUrl,
} from "../config/keys"

export type {
  AppKeysShape,
  FirebaseKeys,
  StripeKeys,
  FunctionKeysShape,
} from "../config/keys"

export { APP_KEYS as default } from "../config/keys"

