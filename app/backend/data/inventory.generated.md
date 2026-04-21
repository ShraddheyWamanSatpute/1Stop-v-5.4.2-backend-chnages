# Data Layer Inventory

Generated: 2026-04-15T23:35:39.928Z

Modules: 15
Exports: 841

## Accounting

- Exports: 20
- Callsites: 0
- Export names: fetchJournals, createJournal, updateJournal, deleteJournal, approveJournal, postJournal, reverseJournal, fetchDimensions, createDimension, updateDimension, deleteDimension, fetchPeriodLocks, createPeriodLock, updatePeriodLock, lockPeriod, unlockPeriod, fetchOpeningBalances, createOpeningBalance, updateOpeningBalance, deleteOpeningBalance

## Bookings

- Exports: 59
- Callsites: 2
- Export names: fetchBookings, getBookingById, submitPreorderResponses, fetchLocations, createLocation, updateLocation, deleteLocation, fetchBookingsByDate, createBooking, updateBooking, deleteBooking, fetchTables, createTable, updateTable, deleteTable, fetchTableTypes, createTableType, updateTableType, deleteTableType, fetchBookingTypes, createBookingType, updateBookingType, deleteBookingType, fetchBookingStatuses, createBookingStatus, updateBookingStatus, deleteBookingStatus, fetchPreorderProfiles, savePreorderProfile, deletePreorderProfile, appendBookingMessage, fetchWaitlist, addToWaitlist, updateWaitlistEntry, removeFromWaitlist, fetchCustomers, saveCustomer, deleteCustomer, fetchBookingSettings, saveBookingSettings, fetchFloorPlans, fetchBookingStats, saveFloorPlan, deleteFloorPlan, calculateBookingStats, useBookings, useTables, useWaitlist, fetchBookingTags, createBookingTag, updateBookingTag, deleteBookingTag, fetchStockCourses, fetchStockProducts, createFloorPlan, updateFloorPlan, updateTableElement, addTableToFloorPlan, removeTableFromFloorPlan
- Files: app/backend/context/AnalyticsContext.tsx, app/backend/functions/Bookings.tsx

## Company

- Exports: 83
- Callsites: 5
- Export names: fetchCompanyReports, fetchCompanyReport, saveCompanyReport, deleteCompanyReport, fetchCompanySectionSettings, saveCompanySectionSettings, fetchDataConfiguration, saveDataConfiguration, saveSiteDataConfiguration, getUserCompanyAssociation, getUserCompaniesRaw, createCompanyInDb, updateCompanyInDb, getCompanyFromDb, deleteCompanyFromDb, initializePermissionsInDb, updateRolePermissionsInDb, updateDepartmentPermissionsInDb, updateUserPermissionsInDb, updateEmployeePermissionsInDb, getPermissionsFromDb, updateDefaultRoleInDb, updateDefaultDepartmentInDb, updateDefaultPermissionsInDb, updateDepartmentPermissionsActiveInDb, updateRolePermissionsActiveInDb, updateUserPermissionsActiveInDb, updateEmployeePermissionsActiveInDb, initializeConfigInDb, updateCompanyConfigInDb, updateSiteConfigInDb, updateSubsiteConfigInDb, getConfigFromDb, createSiteInDb, updateSiteInDb, deleteSiteFromDb, invalidateSitesCache, getSitesFromDb, createSubsiteInDb, updateSubsiteInDb, getSubsiteFromDb, deleteSubsiteFromDb, fetchChecklistsFromDb, createChecklistInDb, updateChecklistInDb, deleteChecklistFromDb, fetchChecklistCompletionsFromDb, createChecklistCompletionInDb, deleteChecklistCompletionFromDb, fetchCompanySetupFromDb, saveCompanySetupToDb, fetchUserProfileFromDb, updateUserProfileInDb, fetchCompanyMessagesFromDb, createCompanyMessageInDb, createSiteInviteInDb, getSiteInvitesFromDb, getSiteInviteByCodeFromDb, updateSiteInviteInDb, createCompanyInviteInDb, getCompanyInviteByCodeFromDb, updateCompanyInviteInDb, getCompanyUserFromDb, updateCompanyUserInDb, getUserCompanyFromDb, updateUserCompanyInDb, addUserToCompanyInDb, setCompanyUserInDb, createEmployeeJoinCodeInDb, getEmployeeJoinCodesFromDb, getEmployeeJoinCodeByCodeFromDb, revokeEmployeeJoinCodeInDb, getCompanyUsersFromDb, removeUserCompanyFromDb, removeCompanyUserFromDb, fetchChecklistSettings, fetchContractTemplates, saveContractTemplate, deleteContractTemplate, fetchContracts, saveContract, updateContractField, getUserCompaniesFromDb
- Files: app/backend/context/AnalyticsContext.tsx, app/backend/context/CompanyContext.tsx, app/backend/functions/Company.tsx, app/frontend/pages/company/SiteManagement.tsx, mobile/backend/utils/mobileEmployeeLookup.ts

## Finance

- Exports: 113
- Callsites: 4
- Export names: fetchFinanceSettings, saveFinanceSettings, fetchFinanceIntegrations, saveFinanceIntegration, fetchAccounts, createAccount, updateAccount, deleteAccount, fetchTransactions, createTransaction, fetchBills, createBill, fetchContacts, fetchBankAccounts, fetchBudgets, createBudget, updateBudget, deleteBudget, fetchDailyForecasts, upsertDailyForecast, deleteDailyForecast, fetchExpenses, createExpense, updateExpense, deleteExpense, fetchInvoices, fetchQuotes, createQuote, updateQuote, deleteQuote, createInvoice, updateInvoice, updateBill, deleteBill, createContact, updateContact, deleteContact, createBankAccount, updateBankAccount, deleteBankAccount, fetchBankStatements, createBankStatement, updateBankStatement, fetchBankRules, createBankRule, updateBankRule, deleteBankRule, fetchBankTransfers, createBankTransfer, updateBankTransfer, deleteBankTransfer, fetchClearingAccounts, createClearingAccount, updateClearingAccount, deleteClearingAccount, fetchFXRevaluations, createFXRevaluation, updateFXRevaluation, fetchJournals, createJournal, updateJournal, deleteJournal, approveJournal, postJournal, reverseJournal, fetchPeriodLocks, createPeriodLock, updatePeriodLock, deletePeriodLock, fetchDimensions, createDimension, updateDimension, deleteDimension, fetchReports, fetchCurrencies, createCurrency, updateCurrency, deleteCurrency, fetchExchangeRates, createExchangeRate, deleteExchangeRate, fetchPayments, createPayment, updatePayment, deletePayment, fetchCreditNotes, createCreditNote, updateCreditNote, deleteCreditNote, fetchPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, fetchTaxRates, createTaxRate, updateTaxRate, deleteTaxRate, fetchPaymentTerms, createPaymentTerm, fetchBankReconciliations, createBankReconciliation, updateBankReconciliation, fetchJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry, saveReport, deleteReport, deleteInvoice, fetchOpeningBalances, createOpeningBalance, updateOpeningBalance, deleteOpeningBalance
- Files: app/backend/context/AnalyticsContext.tsx, app/backend/context/FinanceContext.tsx, app/backend/functions/BudgetReports.tsx, app/frontend/pages/finance/Currency.tsx

## FinanceAccounting

- Exports: 19
- Callsites: 0
- Export names: fetchJournals, createJournal, updateJournal, deleteJournal, approveJournal, postJournal, reverseJournal, fetchDimensions, createDimension, updateDimension, deleteDimension, fetchPeriodLocks, createPeriodLock, updatePeriodLock, deletePeriodLock, fetchOpeningBalances, createOpeningBalance, updateOpeningBalance, deleteOpeningBalance

## FinanceJournals

- Exports: 19
- Callsites: 0
- Export names: fetchJournals, createJournal, updateJournal, deleteJournal, approveJournal, postJournal, reverseJournal, fetchPeriodLocks, createPeriodLock, updatePeriodLock, deletePeriodLock, fetchDimensions, createDimension, updateDimension, deleteDimension, fetchOpeningBalances, createOpeningBalance, updateOpeningBalance, deleteOpeningBalance

## HRs

- Exports: 80
- Callsites: 4
- Export names: fetchServiceChargeRules, saveServiceChargeRules, fetchPosBills, saveServiceChargeAllocation, saveServiceChargeEmployeeAllocation, fetchHrEmailConfig, saveHrEmailConfig, fetchHRCollection, fetchHRSettingsSection, saveHRSettingsSection, fetchHRIntegrations, saveHRIntegration, fetchHREmployeeDefaults, saveHREmployeeDefaults, fetchHRPayrollSettings, saveHRPayrollSettings, findHRSchedulePath, findHRReadPath, useHRData, updateHRAnalytics, fetchTrainings, createTraining, updateTraining, deleteTraining, fetchTimeOffs, createTimeOff, updateTimeOff, deleteTimeOff, fetchWarnings, createWarning, updateWarning, deleteWarning, fetchAttendances, createAttendance, updateAttendance, deleteAttendance, fetchJobs, createJob, updateJob, deleteJob, fetchCandidates, createCandidate, updateCandidate, deleteCandidate, createInterview, updateInterview, deleteInterview, fetchInterviews, fetchContracts, updateContract, fetchContractTemplates, createContract, createContractTemplate, updateContractTemplate, deleteContract, deleteContractTemplate, fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, fetchBenefits, fetchEmployees, createEmployee, updateEmployee, deleteEmployee, fetchRoles, fetchDepartments, fetchSchedules, createSchedule, updateSchedule, deleteSchedule, handleHRActionDB, createRole, updateRole, deleteRole, createDepartment, updateDepartment, deleteDepartment, fetchPayroll, fetchPerformanceReviews
- Files: app/backend/context/AnalyticsContext.tsx, app/backend/context/HRContext.tsx, app/backend/functions/HRs.tsx, mobile/backend/utils/mobileEmployeeLookup.ts

## Location

- Exports: 7
- Callsites: 0
- Export names: fetchLocations, createLocation, updateLocation, deleteLocation, getLocationsByType, getActiveLocations, searchLocations

## Messenger

- Exports: 44
- Callsites: 1
- Export names: createChat, getChat, getUserChats, getCompanyChats, getSiteChats, getDepartmentChats, getRoleChats, updateChat, deleteChat, sendMessage, getMessages, subscribeToMessages, markMessageAsRead, addReactionToMessage, removeReactionFromMessage, editMessage, deleteMessage, pinMessage, unpinMessage, searchMessages, createCategory, getCategories, updateCategory, deleteCategory, updateUserStatus, getUserStatus, getUserDetails, getCompanyUsers, getChatSettings, updateChatSettings, saveDraftMessage, getDraftMessage, deleteDraftMessage, getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, subscribeToNotifications, uploadAttachment, fetchContacts, addContact, updateContact, deleteContact, subscribeToChats, subscribeToUserStatus
- Files: app/backend/functions/Messenger.tsx

## Notifications

- Exports: 14
- Callsites: 1
- Export names: createNotificationInDb, fetchNotificationsFromDb, fetchFilteredNotificationsFromDb, markNotificationAsReadInDb, markAllNotificationsAsReadInDb, deleteNotificationFromDb, deleteAllNotificationsFromDb, fetchNotificationSettingsFromDb, saveNotificationSettingsToDb, markNotificationAsReadForUserInDb, getUnreadCountForUserFromDb, getUserNotificationHistoryFromDb, getUnreadNotificationCountFromDb, cleanupOldNotificationsFromDb
- Files: app/backend/functions/Notifications.tsx

## POS

- Exports: 86
- Callsites: 3
- Export names: fetchPOSSettings, savePOSSettings, fetchPOSIntegrations, savePOSIntegration, fetchBills, fetchOpenBills, fetchClosedBills, fetchTransactions, createBill, updateBill, deleteBill, fetchTillScreens, createTillScreen, updateTillScreen, deleteTillScreen, fetchPaymentTypes, createPaymentType, updatePaymentType, deletePaymentType, fetchFloorPlans, createFloorPlan, updateFloorPlan, deleteFloorPlan, fetchTables, createTable, updateTable, deleteTable, fetchDiscounts, createDiscount, updateDiscount, deleteDiscount, fetchPromotions, createPromotion, updatePromotion, deletePromotion, fetchCorrections, createCorrection, updateCorrection, deleteCorrection, fetchBagCheckItems, createBagCheckItem, updateBagCheckItem, deleteBagCheckItem, fetchBagCheckConfig, updateBagCheckConfig, fetchLocations, createLocation, updateLocation, deleteLocation, fetchDevices, createDevice, updateDevice, deleteDevice, fetchPaymentIntegrations, createPaymentIntegration, updatePaymentIntegration, deletePaymentIntegration, fetchTickets, createTicket, updateTicket, deleteTicket, fetchTicketSales, createTicketSale, updateTicketSale, deleteTicketSale, fetchPaymentTransactions, fetchPaymentTransactionsByBill, createPaymentTransaction, updatePaymentTransaction, deletePaymentTransaction, fetchSales, createSale, fetchSalesByDateRange, fetchSalesByProduct, fetchGroups, createGroup, updateGroup, deleteGroup, fetchCourses, createCourse, updateCourse, deleteCourse, fetchCards, createCard, updateCard, deleteCard
- Files: app/backend/context/POSContext.tsx, app/backend/functions/POS.tsx, app/backend/services/pos-integration/lightspeed/LightspeedSyncService.ts

## Product

- Exports: 10
- Callsites: 0
- Export names: fetchProducts, createProduct, updateProduct, deleteProduct, fetchProductCategories, createProductCategory, updateProductCategory, deleteProductCategory, searchProducts, getProductByBarcode

## Settings

- Exports: 47
- Callsites: 10
- Export names: fetchAllInvites, updateInviteInDb, fetchUserCompaniesRaw, fetchUserDataRaw, setUserLastLogin, subscribeAllUsers, fetchIntegrationsFromPath, saveIntegrationToPath, signInWithEmail, signUpWithEmail, signOutUser, resendEmailVerification, sendPasswordReset, sendCustomVerificationEmail, sendCustomVerificationEmailToEmail, updateUserFirebaseProfile, getCurrentFirebaseUser, loginWithEmailAndPassword, registerWithEmailAndPassword, createUserProfileInDb, updateAvatarInDb, updateThemeInDb, updateBusinessLogoInDb, getUserData, updateUserData, setCurrentCompany, addCompanyToUser, removeCompanyFromUser, fetchUserPersonalSettings, fetchPersonalSettings, updatePersonalSettings, updateAvatar, fetchUserPreferencesSettings, fetchPreferencesSettings, updatePreferencesSettings, updateTheme, fetchCompanyBusinessSettings, fetchBusinessSettings, updateBusinessSettings, updateBusinessLogo, fetchAllSettings, subscribeToSettings, fetchUserProfileFromDb, updateUserProfileInDb, checkUserExists, initializeUserSettingsInDb, checkSettingsPermission
- Files: admin/backend/context/AdminContext.tsx, admin/backend/data/Settings.ts, admin/backend/providers/supabase/Settings.ts, admin/frontend/qr/Landing.tsx, app/backend/context/AnalyticsContext.tsx, app/backend/context/BookingsContext.tsx, app/backend/context/SettingsContext.tsx, app/backend/functions/Company.tsx, app/backend/functions/Settings.tsx, app/frontend/pages/company/SiteManagement.tsx

## Stock

- Exports: 215
- Callsites: 6
- Export names: deleteLocation, addSalesDivision, updateSalesDivision, deleteSalesDivision, addSale, updateSale, deleteSale, addTaxRate, updateSalesCategory, deleteSalesCategory, recordSale, fetchOpenBills, fetchClosedBills, saveBill, fetchProducts, fetchProductById, addProduct, createProduct, updateProduct, deleteProduct, fetchSales, fetchProductsLegacy, fetchProductByIdLegacy, subscribeToPaymentTypes, updatePaymentType, deletePaymentType, addPaymentType, subscribeToDevices, subscribeToLocations, addDevice, updateDevice, deleteDevice, subscribeToCorrections, addCorrection, updateCorrection, deleteCorrection, saveTillScreen, fetchStockHistory, createBill, updateBill, deleteBill, fetchBill, fetchPaymentTypes, fetchDevices, fetchCorrections, fetchDiscounts, addDiscount, updateDiscount, deleteDiscount, fetchPromotions, addPromotion, updatePromotion, deletePromotion, fetchSalesDivisions, fetchCategories, fetchSubcategories, addProductLegacy, updateProductLegacy, deleteProductLegacy, updatePurchase, createPurchase, savePurchase, deletePurchase, fetchAllPurchases, fetchAllStockCounts, saveStockCount, fetchLatestCountsForProducts, transferStock, fetchStockLocations, addStockLocation, updateStockLocation, deleteStockLocation, fetchFloorPlans, fetchTillScreens, addFloorPlan, updateFloorPlan, addFloorPlanWithBasePath, deleteFloorPlan, fetchTables, addTable, updateTable, deleteTable, updateTillScreen, saveTicket, updateTicketInDb, deleteTicketFromDb, fetchTickets, saveTicketSale, getTicketSaleByQR, updateTicketSaleInDb, fetchTicketSales, saveBagCheckItem, updateBagCheckItemInDb, getBagCheckItemByQR, fetchBagCheckItems, fetchBagCheckConfig, saveBagCheckConfig, updateStockCountStatus, updatePurchaseStatus, combineDuplicateStockItems, combineDuplicatePurchaseItems, createSaleRecord, updateProductStockLevel, saveParLevelProfile, fetchParProfiles, deleteParProfile, fetchCourses, saveCourse, updateCourse, deleteCourse, saveMeasureToBasePath, updateMeasureInBasePath, deleteMeasureFromBasePath, subscribeStockEmailMessages, fetchStockEmailConfig, saveStockEmailConfig, subscribeFavoriteProductIds, addFavoriteProduct, removeFavoriteProduct, fetchStockSettings, saveStockSettings, fetchStockTargets, saveStockTarget, deleteStockTarget, fetchStockIntegrations, saveStockIntegration, getStockCount, subscribeTillScreens, deleteTillScreen, setDefaultTillScreen, fetchGroups, saveGroup, getStockCountHistory, getPurchasesHistory, getSalesHistory, fetchPurchases, fetchPurchasesHistory, fetchSalesHistory, saveProduct, createMeasure, fetchMeasureData, createSupplier, updateSupplier, deleteSupplier, createCategory, updateCategory, deleteCategory, getItemMeasures, calculateCostPerUnit, calculateIngredientCost, getConversionGroup, getCompatibleMeasures, savePreset, getPresets, addPurchase, fetchPresetsFromDB, savePresetToDB, convertToBase, fetchParLevels, saveParLevel, deleteParLevel, fetchMeasures, fetchMeasuresFromBasePath, fetchSuppliers, fetchStockItems, addStockItem, updateStockItem, deleteStockItem, fetchSuppliersData, fetchSuppliersFromBasePath, addSupplier, fetchPurchaseOrders, addPurchaseOrder, updatePurchaseOrder, fetchLocations, fetchCurrentStock, createTable, saveFloorPlan, fetchMeasureUnits, deletePurchaseOrder, fetchTillScreen, saveTillScreenWithId, fetchStockItems2, createStockItem2, updateStockItem2, deleteStockItem2, fetchSuppliers2, createSupplier2, fetchPurchaseOrders2, createPurchaseOrder2, fetchStockCounts2, createStockCount2, updateStockCount2, deleteStockCount2, adjustStockLevel2, getLowStockItems2, calculateStockValuation2, addLocation, updateLocation, getPurchaseDetails, fetchSalesDivisionsFromBasePath, fetchCategoriesFromBasePath, fetchSubcategoriesFromBasePath, fetchAllPurchasesFromBasePath, fetchAllStockCountsFromBasePath, deleteStockCountFromBasePath, fetchAllStockTransfersFromBasePath, fetchStockTransferByIdFromBasePath, saveStockTransfer, deleteStockTransferFromBasePath, fetchStockItemsFromBasePath, fetchPurchaseOrdersFromBasePath, fetchLatestCountsForProductsFromBasePath, fetchPurchasesHistoryFromBasePath, fetchSalesHistoryFromBasePath
- Files: app/backend/context/AnalyticsContext.tsx, app/backend/context/StockContext.tsx, app/backend/functions/Stock.tsx, app/backend/services/pos-integration/lightspeed/LightspeedSyncService.ts, app/frontend/components/stock/OrderDeliveryPanel.tsx, app/frontend/pages/ConnectSupplier.tsx

## Supply

- Exports: 25
- Callsites: 3
- Export names: subscribeClients, subscribeOrders, subscribeDeliveries, fetchClients, fetchOrders, fetchDeliveries, createClient, updateClient, deleteClient, createOrder, updateOrder, deleteOrder, createDelivery, updateDelivery, deleteDelivery, createClientInvite, getClientInviteByCode, updateClientInvite, revokeClientInvite, getGlobalClientInviteByCode, updateGlobalClientInvite, getSupplierConnection, saveSupplierConnection, fetchSupplySettingsSection, saveSupplySettingsSection
- Files: app/backend/context/SupplyContext.tsx, app/frontend/pages/ConnectSupplier.tsx, app/frontend/pages/stock/StockOrder.tsx
