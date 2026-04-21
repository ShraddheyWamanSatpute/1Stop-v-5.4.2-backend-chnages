# Data Layer Migration

## Goal

Preserve the current frontend and context call sites while allowing each data module to run against either Firebase Realtime Database or Supabase/PostgreSQL.

## Architecture

- `app/backend/rtdatabase/*`
  - Current Firebase implementation and source-of-truth behavior.
- `app/backend/data/*`
  - Generated compatibility facade used by contexts, backend helpers, and direct frontend imports.
- `app/backend/providers/supabase/*`
  - Supabase provider surface with the same export names as the RTDB modules.
- `app/backend/data/providerRegistry.ts`
  - Chooses provider per module.
- `scripts/generate-data-layer.cjs`
  - Regenerates facades, Supabase stubs, and a full inventory of exports and call sites.
- `scripts/audit-data-layer.cjs`
  - Verifies every RTDB export is mirrored by the `data` facade and provider layer, and records mobile consideration details.

## Provider Selection

- Default provider is controlled by `VITE_DATA_PROVIDER`.
- Optional per-module overrides are controlled by `VITE_DATA_PROVIDER_OVERRIDES`.
- Dev-only local overrides can be placed in:
  - `localStorage["onestop:data-provider"]`
  - `localStorage["onestop:data-provider-overrides"]`

Override format:

```text
Stock:supabase,Finance:supabase
```

Or JSON:

```json
{"Stock":"supabase","Finance":"supabase"}
```

For the current live slices, set:

- `VITE_DATA_PROVIDER=firebase`
- `VITE_DATA_PROVIDER_OVERRIDES=Supply:supabase,Finance:supabase,Stock:supabase,Company:supabase,HRs:supabase,Location:supabase,Product:supabase,Notifications:supabase,Bookings:supabase,Settings:supabase,POS:supabase,Messenger:supabase`

Cloud Functions environment required for the Supabase bridge:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Current SQL migrations are at:

- `supabase/migrations/20260331_supply.sql`
- `supabase/migrations/20260331_finance_core.sql`
- `supabase/migrations/20260331_stock_core.sql`
- `supabase/migrations/20260331_company_core.sql`
- `supabase/migrations/20260331_hr_core.sql`
- `supabase/migrations/20260331_admin_core.sql`
- `supabase/migrations/20260331_location_product_core.sql`
- `supabase/migrations/20260331_notifications_core.sql`
- `supabase/migrations/20260331_finance_journals_core.sql`
- `supabase/migrations/20260331_bookings_core.sql`
- `supabase/migrations/20260331_settings_core.sql`
- `supabase/migrations/20260331_pos_core.sql`
- `supabase/migrations/20260331_messenger_core.sql`

## Normalized PostgreSQL Model

Core scope tables:

- `companies`
- `sites`
- `subsites`
- `users`
- `company_users`
- `site_users`
- `subsite_users`

Common columns:

- `id`
- `company_id`
- `site_id`
- `subsite_id`
- `created_at`
- `updated_at`
- `archived_at`
- `legacy_rtdb_path`

Domain tables:

- Stock: `stock_products`, `stock_items`, `stock_counts`, `stock_transfers`, `stock_locations`, `stock_suppliers`, `purchase_orders`, `par_level_profiles`
- Finance: `accounts`, `journal_entries`, `transactions`, `bills`, `invoices`, `quotes`, `budgets`, `payments`, `contacts`, `bank_accounts`, `exchange_rates`
- HR: `employees`, `departments`, `roles`, `schedules`, `time_off_requests`, `attendances`, `trainings`, `benefits`, `payroll_runs`, `performance_reviews`
- Bookings: `bookings`, `booking_tables`, `booking_statuses`, `booking_types`, `waitlist_entries`, `booking_customers`, `booking_tags`, `floor_plans`
- POS: `pos_bills`, `pos_bill_items`, `pos_sales`, `pos_payment_types`, `pos_devices`, `pos_tables`, `pos_floor_plans`, `pos_discounts`, `pos_promotions`
- Supply: `supply_clients`, `supply_orders`, `supply_deliveries`, `supply_invites`, `supplier_connections`
- Messaging: `conversations`, `conversation_members`, `messages`, `message_reactions`, `draft_messages`
- Notifications: `notifications`, `notification_reads`, `notification_settings`

## Rollout Order

1. Keep all modules on Firebase through the new `data` facade.
2. Implement Supabase provider module-by-module.
3. Switch low-risk modules first:
   - `Supply` (implemented first with polling subscriptions via `/api/ops/data/supply/*`)
   - `Finance` (core entities implemented via `/api/ops/data/finance/*`; unported exports still fall back to Firebase)
   - `Stock` (core entities implemented via `/api/ops/data/stock/*`; unported exports still fall back to Firebase)
   - `Company` (core company/setup/config/sites/permissions implemented via `/api/ops/data/company/*`; invite, profile, checklist, and messaging helpers still fall back to Firebase)
4. Run dual verification before enabling a module in production.
5. Migrate realtime-only domains later:
   - `Notifications`
   - high-frequency live `POS`

## Implemented Coverage

- `Supply`
  - Supabase-backed client provider implemented.
  - Cloud Functions bridge implemented at `/api/ops/data/supply/*`.
  - Realtime-compatible subscriptions preserved with polling.
- `Finance`
  - Supabase-backed core CRUD implemented for accounts, transactions, bills, contacts, and budgets.
  - Journals, dimensions, period locks, and opening balances now also run through the Supabase bridge.
- `Stock`
  - Supabase-backed core CRUD implemented for suppliers, stock items, purchase orders, and stock counts.
  - Remaining Stock exports continue to use Firebase through the same facade.
- `Company`
  - Supabase-backed core CRUD implemented for company records, permissions, setup, config, sites, and subsites.
  - Company users and user-company lists are available through the bridge for existing contexts.
  - Invite flows, checklist storage, user profiles, messages, and join-code helpers still fall back to Firebase today.
- `HRs`
  - Supabase-backed core CRUD implemented for employees, time off, attendances, and schedules via `/api/ops/data/hr/*`.
  - Remaining HR exports still fall back to Firebase through the same facade until each slice is ported.
  - Mobile ESS clock-in/out, time off, and emergency-contact updates now flow through `HRContext` instead of direct RTDB HR writes.
- `Location`
  - Supabase-backed CRUD and derived query helpers implemented via `/api/ops/data/location/*`.
- `Product`
  - Supabase-backed product and product-category CRUD implemented via `/api/ops/data/product/*`.
  - Search and barcode lookup helpers now operate against the Supabase-backed product fetch path.
- `Notifications`
  - Supabase-backed notifications and notification-settings CRUD implemented via `/api/ops/data/notifications/*`.
  - User read-state, unread counts, notification history, filtered fetches, and cleanup jobs now run through the Supabase bridge.
- `Accounting` / `FinanceAccounting` / `FinanceJournals`
  - The journal-family modules now share the Supabase-backed finance journal bridge for journals, dimensions, period locks, and opening balances.
  - Journal approve/post/reverse flows now route through `/api/ops/data/finance/*`, including transaction creation and account-balance updates during posting.
- `Bookings`
  - Supabase-backed core CRUD is implemented for bookings, tables, table types, booking types, statuses, waitlist, customers, settings, floor plans, tags, preorder profiles, and booking stats.
  - Floor-plan table-element mutations and booking message appends now route through `/api/ops/data/bookings/*`.
  - Stock-course/product lookups still fall back to the existing Firebase-backed booking helpers for now.
- `Settings`
  - Supabase-backed user profile, personal settings, preferences, current-company selection, membership-list updates, business settings, combined settings fetches, and settings permission checks now route through `/api/ops/data/settings/*`.
  - Auth-specific exports intentionally stay on the Firebase provider path, and the server bridge mirrors settings/profile writes back into Firebase RTDB for mixed-provider compatibility during rollout.
- `Messenger`
  - Supabase-backed messenger chat, message, category, status, chat-settings, draft, notification, and contact flows now route through `/api/ops/data/messenger/*`.
  - Polling subscriptions preserve the existing chat/message/status/notification subscription signatures without frontend call-site changes.
  - User-directory lookups and attachment uploads intentionally still fall back to the Firebase provider path for now.
- `POS`
  - Supabase-backed POS CRUD now routes through `/api/ops/data/pos/*` for bills, transactions, till screens, payment types, floor plans, tables, discounts, promotions, corrections, bag-check items/config, locations, devices, payment integrations, tickets, ticket sales, payment transactions, sales, groups, courses, and cards.
  - Derived POS helpers like open/closed bills, payment-transactions-by-bill, and sales filters now run against the Supabase-backed entity fetches.
- `Admin`
  - Supabase-backed admin bridge implemented via `/api/ops/data/admin/*`.
  - `AdminProfile`, `Analytics`, `Content`, `Marketing`, `Notes`, `QR`, and `Settings` now have real admin provider implementations instead of stubs.
  - Admin analytics is now aggregated from the Supabase-backed admin content, marketing, and QR lead datasets.

## Coverage Audit

Run:

- `npm run data:audit`

Current audit status:

- App parity: `15/15` RTDB modules mirrored in both `app/backend/data/*` and `app/backend/providers/supabase/*`
- Admin parity: `7/7` RTDB modules mirrored in both `admin/backend/data/*` and `admin/backend/providers/supabase/*`
- Mobile direct imports of shared app data modules: `2`
- Mobile raw `/data/...` tree writes have been removed from ESS context flows.
- Mobile still references shared data facades in:
  - `mobile/backend/utils/mobileEmployeeLookup.ts`

Generated audit artifacts:

- `docs/data-layer-coverage.generated.json`
- `docs/data-layer-coverage.generated.md`

## Safety Gates

- Regenerate inventory after every RTDB export change.
- Confirm every `rtdatabase/*` export exists in the matching Supabase module before switching that module.
- Compare Firebase and Supabase responses for the same inputs before cutover.
- Switch providers per module, not globally, until parity is proven.
