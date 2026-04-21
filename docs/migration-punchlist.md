# Firebase → Supabase Migration Punch List

Generated: 2026-04-01

## Goal

All business data reads/writes go through the `app/backend/data/*` facade layer.
No frontend component or context should import directly from `services/Firebase` for business data operations,
or from `rtdatabase/*` directly.

Firebase Auth + Cloud Functions can stay for now.

---

## Phase 1: Direct Bypasses (CRITICAL — break when provider switches)

### 1a. Direct `rtdatabase/*` imports in frontend

| File | Import | Fix |
|------|--------|-----|
| `app/frontend/pages/stock/StockOrder.tsx:45` | `rtdatabase/Supply` (createOrder, getSupplierConnection) | Switch to `data/Supply` |

### 1b. Direct Firebase RTDB writes for business data in frontend components

| File | What it does | Fix |
|------|-------------|-----|
| `app/frontend/pages/stock/StockOrder.tsx:40` | onValue/set/remove for favorites path | Route through StockContext or data/Stock |
| `app/frontend/pages/company/SiteManagement.tsx:742` | `set(ref(db, users/{uid}))` creates user profile | Route through data/Settings or data/Company |
| `app/frontend/pages/company/UserSiteAllocation.tsx:30` | `get/set(ref(db, ...))` for user-site allocation | Route through CompanyContext |
| `app/frontend/pages/company/ContractManagement.tsx:50` | `get/set/remove/push` for contracts | Route through CompanyContext |
| `app/frontend/pages/company/MyChecklist.tsx:31` | `get(ref(db, ...))` for checklist data | Route through CompanyContext |
| `app/frontend/pages/company/CompanyInfo.tsx:5` | `uploadFile` | Keep (storage, not RTDB) |
| `app/frontend/pages/bookings/PreorderPage.tsx:7-8` | `get/update` for preorder data | Route through BookingsContext or data/Bookings |
| `app/frontend/pages/EmployeeOnboarding.tsx:46` | `get/update` for onboarding data | Route through HRContext or data/HRs |
| `app/frontend/pages/Login.tsx:19` | `get(ref(db, ...))` for user data on login | Likely Settings/auth — review |
| `app/frontend/pages/Register.tsx:21` | `update` for user profile on register | Route through data/Settings |
| `app/frontend/pages/StaffCardLanding.tsx:16` | `get(ref(db, ...))` for staff card lookup | Route through data/Company or data/HRs |
| `app/frontend/pages/AcceptAdminInvite.tsx` | Direct Firebase for invite acceptance | Route through data/Company |
| `app/frontend/pages/tools/SmokeTop3.tsx:9` | `set/remove` for smoke test data | Test-only — low priority |
| `app/frontend/components/bookings/LocationManagement.tsx` | Direct Firebase | Route through BookingsContext |
| `app/frontend/components/company/ChecklistCompletion.tsx` | Direct Firebase | Route through CompanyContext |
| `app/frontend/components/hr/ComplianceTracking.tsx` | Direct Firebase | Route through HRContext |
| `app/frontend/components/hr/EmployeeList.tsx` | Direct Firebase | Route through HRContext |
| `app/frontend/components/hr/EmployeeSelfService.tsx` | Direct Firebase | Route through HRContext |
| `app/frontend/components/hr/ServiceChargeAllocationPage.tsx` | Direct Firebase | Route through HRContext |
| `app/frontend/components/hr/Settings.tsx` | Direct Firebase | Route through HRContext |
| `app/frontend/components/hr/settings/HMRCSettingsTab.tsx` | Direct Firebase | Route through HRContext or SettingsContext |
| `app/frontend/components/messenger/UserStatusBar.tsx` | Direct Firebase | Route through MessengerContext |
| `app/frontend/components/pos/POSIntegrationSettings.tsx` | Direct Firebase | Route through POSContext |
| `app/frontend/components/reusable/IntegrationManager.tsx` | Direct Firebase | Route through SettingsContext |
| `app/frontend/components/stock/OrderDeliveryPanel.tsx` | Direct Firebase | Route through StockContext |
| `app/frontend/components/stock/StockSettings.tsx` | Direct Firebase | Route through StockContext |
| `app/frontend/components/stock/forms/PurchaseOrderForm.tsx` | Direct Firebase | Route through StockContext |
| `app/frontend/hooks/useStockSettings.ts` | Direct Firebase | Route through StockContext |

### 1c. Admin pages with direct Firebase (admin section — separate concern)

These use Firebase for admin-specific data (email, CRM, tasks, etc.) that is outside the main data layer.

| File | Notes |
|------|-------|
| `app/frontend/pages/admin/AdminCRM.tsx` | Admin CRM data |
| `app/frontend/pages/admin/AdminCalendar.tsx` | Admin calendar |
| `app/frontend/pages/admin/AdminCalendarFull.tsx` | Admin calendar |
| `app/frontend/pages/admin/AdminClients.tsx` | Admin clients |
| `app/frontend/pages/admin/AdminCompanies.tsx` | Admin companies |
| `app/frontend/pages/admin/AdminContracts.tsx` | Admin contracts |
| `app/frontend/pages/admin/AdminCreateCompany.tsx` | Admin company creation |
| `app/frontend/pages/admin/AdminEmail.tsx` | Admin email (own RTDB paths) |
| `app/frontend/pages/admin/AdminProfile.tsx` | Admin profile |
| `app/frontend/pages/admin/AdminProjects.tsx` | Admin projects |
| `app/frontend/pages/admin/AdminReferrals.tsx` | Admin referrals |
| `app/frontend/pages/admin/AdminSocial.tsx` | Admin social |
| `app/frontend/pages/admin/AdminStaff.tsx` | Admin staff |
| `app/frontend/pages/admin/AdminTasks.tsx` | Admin tasks |
| `app/frontend/pages/admin/AdminViewer.tsx` | Admin viewer |
| `app/frontend/pages/admin/CreateAdmin.tsx` | Admin creation |

### 1d. Mobile direct Firebase bypasses

| File | What it does | Fix |
|------|-------------|-----|
| `mobile/backend/utils/mobileEmployeeLookup.ts:9` | `get/update` on `companies/{id}/users/{uid}` and `users/{uid}/companies/{id}` | Route through data/Company + data/HRs |

---

## Phase 2: Contexts importing Firebase services directly

All 8 contexts below import `db, ref, get, set, update` etc. from `services/Firebase`.
These should be migrated to use the data facade functions from `app/backend/data/*` instead.

| Context | Firebase imports used for |
|---------|--------------------------|
| `BookingsContext.tsx` | `dbRef, dbGet, dbSet, dbOnValue` — direct RTDB subscriptions |
| `CompanyContext.tsx` | `auth, db, ref, get, set, update, remove` — company data ops |
| `FinanceContext.tsx` | `db, ref, get, update, set` — finance data ops |
| `HRContext.tsx` | `db, ref, get, update, set` — HR data ops |
| `POSContext.tsx` | `db, dbRef, dbGet, dbUpdate, dbSet` — POS data ops |
| `SettingsContext.tsx` | `auth, db, ref, get, set` — auth + settings (auth can stay) |
| `StockContext.tsx` | `db` + `ref, get, update, set, remove` from `firebase/database` | 
| `SupplyContext.tsx` | `db, get, ref, update` — supply data ops |
| `AnalyticsContext.tsx` | `db, ref, get, set` — analytics cache/aggregation |

---

## Phase 3: Supabase Provider Completion (fallback exports)

| Module | Total Exports | Native Supabase | Still Firebase Fallback |
|--------|--------------|-----------------|------------------------|
| Stock | 202 | 15 | **187** |
| Finance | 109 | 37 | **72** |
| HRs | 62 | 16 | **46** |
| Company | 58 | 35 | **23** |
| Settings | 39 | 28 | **11** |
| Messenger | 44 | 41 | **3** |
| Bookings | 53 | 51 | **2** |

Fully ported (100%): Accounting, FinanceAccounting, FinanceJournals, Location, Notifications, POS, Product, Supply

---

## Phase 4: Environment / Deploy Wiring

- [ ] Add `VITE_DATA_PROVIDER` and `VITE_DATA_PROVIDER_OVERRIDES` to root `.env.example`
- [ ] Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `app/functions/env.example`
- [ ] Update deploy scripts if target is "Supabase data + Firebase auth/functions"

---

## Priority Order

1. **Fix direct bypasses** (Phase 1a + 1b) — these break on provider switch
2. **Fix mobile bypass** (Phase 1d) — same risk
3. **Migrate context Firebase imports** (Phase 2) — these are the main data flow
4. **Complete Supabase providers** (Phase 3) — Stock and Finance are biggest gaps
5. **Wire env/deploy** (Phase 4)
6. **Admin pages** (Phase 1c) — lower priority, separate data paths
