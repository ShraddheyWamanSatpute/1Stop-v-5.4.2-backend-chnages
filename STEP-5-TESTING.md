# STEP 5: Test Application Functionality with Supabase

## Action Required
Comprehensive testing of the application with Supabase backend.

## Test Environment Setup
```bash
# Set environment variables for testing
export VITE_DATA_PROVIDER=supabase
export VITE_SUPABASE_URL=your_supabase_project_url
export VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
export VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Start development server
npm run dev
```

## Critical Test Areas

### 1. Authentication Flow
- [ ] User login/logout works
- [ ] Firebase tokens still used for auth
- [ ] User session persistence
- [ ] Permission checks work correctly

### 2. Core Business Functions

#### Supply Management
- [ ] Load supply clients
- [ ] Create/update/delete supply orders
- [ ] Track deliveries
- [ ] Client invite functionality
- [ ] Real-time updates (15-second polling)

#### Financial Operations  
- [ ] Load accounts and transactions
- [ ] Create bills and invoices
- [ ] Financial reporting
- [ ] Budget management

#### Stock Management
- [ ] Product catalog loading
- [ ] Stock count operations
- [ ] Purchase order management
- [ ] Stock transfers

#### HR Functions
- [ ] Employee management
- [ ] Time tracking
- [ ] Schedule management
- [ ] Payroll operations

#### POS Operations
- [ ] Bill creation and payment
- [ ] Sales tracking
- [ ] Till management
- [ ** ] Floor plan operations

#### Company Management
- [ ] Company setup and configuration
- [ ] Site and subsite management
- [ ] User permissions
- [ ] Business settings

### 3. Real-time Features
- [ ] Data subscriptions work (polling)
- [ ] UI updates when data changes
- [ ] No subscription errors in console
- [ ] Proper cleanup on component unmount

### 4. Mobile App Compatibility
- [ ] Mobile app connects successfully
- [ ] Data synchronization works
- [ ] Offline functionality preserved
- [ ] Performance acceptable

## Performance Testing

### Response Time Checks
- [ ] Initial data load < 3 seconds
- [ ] CRUD operations < 1 second
- [ ] Real-time updates < 15 seconds
- [ ] No memory leaks in subscriptions

### Load Testing
```bash
# Simulate multiple users (optional)
npm run test:load:supabase
```

## Error Handling Verification

### Network Errors
- [ ] Graceful handling of connection failures
- [ ] Retry mechanisms work
- [ ] User-friendly error messages

### Data Validation
- [ ] Invalid data rejected appropriately
- [ ] Required field validation works
- [ ] Type safety maintained

## Debug Tools

### Browser Console Checks
```javascript
// Check Supabase client initialization
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Data Provider:', import.meta.env.VITE_DATA_PROVIDER);

// Monitor network requests
// Check for any 404/500 errors
// Verify polling intervals (should be 15 seconds)
```

### Database Verification
```sql
-- Verify data exists in Supabase
SELECT COUNT(*) FROM supply_clients;
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM finance_accounts;

-- Check recent activity
SELECT * FROM supply_clients ORDER BY updated_at DESC LIMIT 5;
```

## Test Results Documentation

Create a test report:
```bash
# Document test results
echo "Test Date: $(date)" > test-results.md
echo "Environment: Development" >> test-results.md
echo "Data Provider: Supabase" >> test-results.md
```

## Common Issues & Solutions

### Issue: Real-time Updates Not Working
**Symptoms**: Data doesn't refresh automatically
**Solution**: Check polling intervals, verify subscription cleanup

### Issue: Authentication Errors
**Symptoms**: 401 errors, login failures
**Solution**: Verify Firebase auth still works, check token passing

### Issue: Performance Degradation
**Symptoms**: Slow page loads, laggy UI
**Solution**: Check database indexes, optimize queries

### Issue: Data Inconsistency
**Symptoms**: Different data between Firebase and Supabase
**Solution**: Re-run migration, verify data transformation rules

## Success Criteria
- [ ] All major workflows functional
- [ ] Performance acceptable (<5% degradation)
- [ ] No critical errors in console
- [ ] Mobile app working
- [ ] Real-time features operational

## Rollback Plan
If testing fails significantly:
```bash
# Switch back to Firebase
export VITE_DATA_PROVIDER=firebase
npm run dev

# Continue using Firebase while issues are resolved
```

## Next Step
Once all tests pass successfully, proceed to STEP 6 for final cutover.
