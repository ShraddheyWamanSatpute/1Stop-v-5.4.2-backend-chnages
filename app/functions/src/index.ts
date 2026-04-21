// Initialize admin first (lazy initialization)
import './admin';

// Export all OAuth functions
export { oauthGoogle, oauthCallbackGmail } from './oauthGoogle';
export { oauthOutlook, oauthCallbackOutlook } from './oauthOutlook';
export { oauthGoogleCalendar, oauthCallbackGoogleCalendar } from "./oauthGoogleCalendar";
export { oauthOutlookCalendar, oauthCallbackOutlookCalendar } from "./oauthOutlookCalendar";
export { checkOAuthStatus, disconnectOAuth } from './checkOAuthStatus';
export { sendTestEmail } from './sendTestEmail';
export { sendEmailWithGmail } from './sendEmailWithGmail';
export { sendStockOrderEmail } from './sendStockOrderEmail';
export { sendHREmployeeStarterEmail } from "./sendHREmployeeStarterEmail";
export { sendCompanyInviteEmail } from './sendCompanyInviteEmail';
export { syncEmailInbox, processEmailOutbox, processEmailOutboxUser } from './adminEmail';
export { processScheduledSocialPosts, onSocialPostCreated } from './socialPoster';
export { listCalendars, listEvents, upsertEvent, deleteEvent, getCalendarTaskLinks } from "./adminCalendar";
export { exchangeHMRCToken } from './hmrcOAuth';
export { testHMRCAPIConnection } from './hmrcTestAPI';
export { testHMRCEPSSubmission } from './hmrcTestEPS';
export { hmrcSubmitRtiXml } from "./hmrcRtiSubmit"
export { createAdminInvite, claimAdminInvite } from './adminStaffInvites';
export { createSuperAdminUser } from './createSuperAdminUser';
export { bootstrapAdmin } from './bootstrapAdmin';
export { apiVersion } from "./apiVersion";
export { assistantGateway } from "./assistantGateway";
export { opsRouter } from "./opsRouter";
export { opsSyncAll } from "./opsScheduler";
export { opsProcessActions } from "./opsActionProcessor";
export { sendAuthEmail } from "./sendAuthEmail";
export { onBugReportCreated } from "./bugReportAutoReply";
export {
  oauthLightspeedK,
  lightspeedKConnect,
  oauthCallbackLightspeedK,
  lightspeedKRefreshToken,
  lightspeedKDisconnect,
} from "./oauthLightspeedK";

export { lightspeedKGetBusinesses, lightspeedKRunSync, lightspeedKScheduledSync } from "./lightspeedKSync";

export {
  adminIntegrationsListCompanies,
  adminIntegrationsListSites,
  adminIntegrationsListSubsites,
  adminIntegrationsKSeriesStatus,
  adminIntegrationsKSeriesPreview,
  adminIntegrationsKSeriesSaveCredentials,
  adminIntegrationsKSeriesSaveBusinessLocation,
  adminIntegrationsKSeriesSyncItems,
  adminIntegrationsKSeriesSyncFinancials,
} from "./adminIntegrationsKSeries";

// HR secure data (server-side encryption/decryption)
export {
  hrListEmployees,
  hrGetEmployee,
  hrUpsertEmployee,
  hrDeleteEmployee,
  hrListPayrolls,
  hrGetPayroll,
  hrSavePayroll,
} from "./hrSecureData"

// One-time HR encryption migration
export { hrMigrateEncryptAtRestV2 } from "./hrMigrateEncryptAtRest"

// HMRC secure token storage (server-side secrets)
export {
  hmrcSaveClientSecret,
  hmrcGetConnectionStatus,
  hmrcExchangeCodeAndStoreTokens,
  hmrcRefreshAccessToken,
} from "./hmrcSecureTokens"

export {
  saveMailboxSecretSettings,
  getMailboxSecretSettingsStatus,
} from "./mailboxSecretSettings"
