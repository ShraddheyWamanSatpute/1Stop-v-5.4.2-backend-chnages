# Data Layer Coverage Audit

Generated: 2026-04-15T23:35:41.149Z

## App

- Modules: 15
- RTDB exports: 841
- Data facade parity: 15/15 modules complete
- Provider mirror parity: 15/15 modules complete
- Manual provider modules: Accounting, Bookings, Company, Finance, FinanceAccounting, FinanceJournals, HRs, Location, Messenger, Notifications, POS, Product, Settings, Stock, Supply
- Stub-only provider modules: none

## Admin

- Modules: 7
- RTDB exports: 31
- Data facade parity: 7/7 modules complete
- Provider mirror parity: 7/7 modules complete
- Manual provider modules: AdminProfile, Analytics, Content, Marketing, Notes, QR, Settings
- Stub-only provider modules: none

## Mobile

- Direct imports of app/admin RTDB or data modules: 2
- Directly imported modules: Company, HRs
- Files with raw /data/... path usage: 0
- Raw data domains referenced: none

## App Module Detail

- Accounting: facade 20/20, provider 20/20, mode manual-passthrough, native overrides 20
- Bookings: facade 59/59, provider 59/59, mode manual-passthrough, native overrides 51
- Company: facade 83/83, provider 83/83, mode manual-passthrough, native overrides 35
- Finance: facade 113/113, provider 113/113, mode manual-passthrough, native overrides 41
- FinanceAccounting: facade 19/19, provider 19/19, mode manual-passthrough, native overrides 19
- FinanceJournals: facade 19/19, provider 19/19, mode manual-passthrough, native overrides 19
- HRs: facade 80/80, provider 80/80, mode manual-passthrough, native overrides 16
- Location: facade 7/7, provider 7/7, mode manual-passthrough, native overrides 7
- Messenger: facade 44/44, provider 44/44, mode manual-passthrough, native overrides 41
- Notifications: facade 14/14, provider 14/14, mode manual-passthrough, native overrides 14
- POS: facade 86/86, provider 86/86, mode manual-passthrough, native overrides 86
- Product: facade 10/10, provider 10/10, mode manual-passthrough, native overrides 10
- Settings: facade 47/47, provider 47/47, mode manual-passthrough, native overrides 30
- Stock: facade 215/215, provider 215/215, mode manual-passthrough, native overrides 22
- Supply: facade 25/25, provider 25/25, mode manual, native overrides 25

## Admin Module Detail

- AdminProfile: facade 4/4, provider 4/4, mode manual, native overrides 4
- Analytics: facade 1/1, provider 1/1, mode manual, native overrides 1
- Content: facade 8/8, provider 8/8, mode manual, native overrides 8
- Marketing: facade 4/4, provider 4/4, mode manual, native overrides 4
- Notes: facade 4/4, provider 4/4, mode manual, native overrides 4
- QR: facade 9/9, provider 9/9, mode manual, native overrides 9
- Settings: facade 1/1, provider 1/1, mode manual, native overrides 1

## Mobile Raw Path Detail

- none
