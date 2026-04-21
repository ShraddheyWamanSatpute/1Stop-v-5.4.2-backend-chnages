# Complete Firebase to Supabase Migration Guide

## Overview

This guide provides a complete, one-time migration approach to move from Firebase Realtime Database to Supabase PostgreSQL. The approach creates a parallel `psql/` folder structure with Supabase equivalents of all RTDB functions, then migrates the data in one go.

## What We've Accomplished

### 1. Parallel Structure Created
- **`app/backend/psql/`** folder created with all 15 modules
- **`app/backend/psql/client.ts`** - Supabase client and helper utilities
- **Complete module mapping** from Firebase RTDB to Supabase PostgreSQL

### 2. All Modules Generated
- Accounting.tsx
- Bookings.tsx  
- Company.tsx
- Finance.tsx
- FinanceAccounting.tsx
- FinanceJournals.tsx
- HRs.tsx
- Location.tsx
- Messenger.tsx
- Notifications.tsx
- POS.tsx
- Product.tsx
- Settings.tsx
- Stock.tsx
- Supply.tsx

### 3. Migration Tools Created
- **`generate-psql-modules.cjs`** - Auto-generates psql modules from rtdatabase
- **`migrate-data-to-supabase.cjs`** - Complete data migration script
- **`update-imports-to-psql.cjs`** - Updates all import statements

### 4. Configuration Updated
- **Supabase keys** added to `app/backend/config/keys.ts`
- **@supabase/supabase-js** dependency installed
- **Environment variables** configured

## Migration Architecture

### Database Schema
All 13 migration files are ready in `supabase/migrations/`:
- 20260331_admin_core.sql
- 20260331_bookings_core.sql
- 20260331_company_core.sql
- 20260331_finance_core.sql
- 20260331_finance_journals_core.sql
- 20260331_hr_core.sql
- 20260331_location_product_core.sql
- 20260331_messenger_core.sql
- 20260331_notifications_core.sql
- 20260331_pos_core.sql
- 20260331_settings_core.sql
- 20260331_stock_core.sql
- 20260331_supply.sql

### Module Mapping
Each Firebase RTDB module maps to specific Supabase tables:

```typescript
// Example: Supply module
TABLE_MAPPINGS = {
  supply: {
    clients: 'supply_clients',
    orders: 'supply_orders',
    deliveries: 'supply_deliveries',
    clientInvites: 'supply_client_invites',
    supplierConnections: 'supply_supplier_connections',
    settings: 'supply_settings'
  }
}
```

## Step-by-Step Migration Process

### Phase 1: Environment Setup

1. **Configure Supabase Environment Variables**
```bash
# Add to your .env.local
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

2. **Apply Database Migrations**
```bash
# Apply all Supabase migrations
supabase db push
```

3. **Verify Supabase Connection**
```bash
# Test the connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
client.from('companies').select('count').then(console.log);
"
```

### Phase 2: Code Migration

1. **Review Generated Modules**
   - Check `app/backend/psql/` folder
   - Verify all 15 modules are generated
   - Customize any module-specific logic if needed

2. **Update Import Statements**
```bash
# Run the import update script
cd app/backend
node scripts/update-imports-to-psql.cjs
```

3. **Manual Import Updates (if needed)**
   - Search for any remaining `../rtdatabase/` imports
   - Replace with `../psql/` imports
   - Update TypeScript imports

### Phase 3: Data Migration

1. **Prepare Firebase Export**
```bash
# Export current Firebase data
firebase database:get / > firebase-backup.json
```

2. **Run Data Migration**
```bash
# Execute the complete migration
cd app/backend
node scripts/migrate-data-to-supabase.cjs
```

3. **Validate Migration Results**
```bash
# Check migration report
cat migration-report.json

# Verify record counts
node scripts/validate-migration.cjs
```

### Phase 4: Testing & Validation

1. **TypeScript Compilation**
```bash
npm run typecheck
```

2. **Application Testing**
```bash
# Start development server
npm run dev

# Test all major workflows:
# - User authentication
# - Company setup
# - Stock management
# - Financial operations
# - HR processes
# - POS operations
```

3. **Performance Testing**
```bash
# Test database performance
node scripts/test-performance.cjs
```

### Phase 5: Cutover

1. **Final Backup**
```bash
# Create final Firebase backup
firebase database:get / > final-backup.json
```

2. **Switch to Supabase**
```bash
# Update environment variable
VITE_DATA_PROVIDER=supabase
```

3. **Monitor Performance**
```bash
# Monitor for 24-48 hours
# Check error rates
# Monitor response times
```

## Migration Scripts Usage

### Generate PSQL Modules
```bash
cd app/backend
node scripts/generate-psql-modules.cjs
```

### Update Imports
```bash
cd app/backend
node scripts/update-imports-to-psql.cjs
```

### Migrate Data
```bash
cd app/backend
node scripts/migrate-data-to-supabase.cjs
```

## Data Transformation Rules

### Firebase to Supabase Mapping

| Firebase Structure | Supabase Structure |
|------------------|-------------------|
| Object with IDs | Array of records |
| Nested data | JSONB payload |
| Firebase timestamps | Unix timestamps |
| Company paths | company_id, site_id, subsite_id |

### Example Transformation
```typescript
// Firebase format
{
  "client1": {
    "name": "Client A",
    "email": "client@a.com",
    "createdAt": 1640995200000
  },
  "client2": { ... }
}

// Supabase format
[
  {
    "id": "client1",
    "company_id": "company123",
    "site_id": "site456",
    "payload": {
      "name": "Client A",
      "email": "client@a.com",
      "createdAt": 1640995200000
    },
    "created_at": 1640995200000,
    "updated_at": 1640995200000
  },
  { ... }
]
```

## Real-time Subscriptions

### Firebase vs Supabase
- **Firebase**: Native real-time listeners
- **Supabase**: Polling-based subscriptions (15-second intervals)

### Implementation
```typescript
// Firebase (original)
export function subscribeClients(path, onData, onError) {
  const r = ref(db, `${path}/clients`)
  return onValue(r, (snap) => onData(toArray(snap.val())), onError)
}

// Supabase (migrated)
export function subscribeClients(path, onData, onError) {
  const scope = getScopeFromPath(path)
  let active = true
  
  const fetchClients = async () => {
    const records = await clientsTable.select(scope)
    if (active) onData(records.map(fromPayload<SupplyClient>))
  }
  
  const intervalId = setInterval(fetchClients, 15000)
  return () => { active = false; clearInterval(intervalId) }
}
```

## Rollback Procedures

### Immediate Rollback (< 5 minutes)
```bash
# Switch back to Firebase
export VITE_DATA_PROVIDER=firebase
npm run dev
```

### Partial Rollback (< 30 minutes)
```bash
# Rollback specific modules
export VITE_DATA_PROVIDER_OVERRIDES="Supply:firebase,Finance:firebase"
```

### Data Rollback (< 2 hours)
```bash
# Restore from backup
firebase database:set / @ firebase-backup.json
```

## Post-Migration Tasks

### 1. Performance Optimization
- Add database indexes based on query patterns
- Optimize frequently accessed tables
- Implement caching strategies

### 2. Monitoring Setup
- Configure database performance monitoring
- Set up error tracking
- Create alerting for anomalies

### 3. Documentation Updates
- Update API documentation
- Create troubleshooting guides
- Document new procedures

### 4. Firebase Decommissioning
- Gradually reduce Firebase usage
- Remove unused Firebase dependencies
- Cancel Firebase services

## Validation Checklist

### Pre-Migration
- [ ] Supabase project configured
- [ ] All migrations applied
- [ ] Environment variables set
- [ ] Backup created
- [ ] Scripts tested

### Post-Migration
- [ ] All modules functioning
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] Real-time features working
- [ ] Mobile app compatible

### Final Validation
- [ ] No data loss detected
- [ ] All workflows tested
- [ ] Performance benchmarks met
- [ ] User acceptance confirmed
- [ ] Documentation updated

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check Supabase URL and keys
   - Verify network connectivity
   - Confirm database is online

2. **Data Validation Errors**
   - Check data transformation rules
   - Verify schema compatibility
   - Review migration logs

3. **Performance Issues**
   - Add missing indexes
   - Optimize queries
   - Check connection pooling

4. **Real-time Issues**
   - Verify polling intervals
   - Check subscription cleanup
   - Monitor WebSocket connections

### Debug Mode
```bash
# Enable debug logging
DEBUG=supabase:* node scripts/migrate-data-to-supabase.cjs
```

## Success Metrics

### Technical Success
- 100% data migration integrity
- <5% performance degradation
- 99.9% uptime during migration
- All real-time features operational

### Business Success
- No user-visible downtime
- All workflows functioning normally
- Mobile app compatibility maintained
- Customer satisfaction >95%

## Support Contacts

- **Database Issues**: Database Administrator
- **Application Issues**: Development Team
- **Infrastructure Issues**: DevOps Team
- **User Support**: Customer Support Team

---

## Quick Start Summary

1. **Setup**: Configure Supabase environment variables
2. **Migrate**: Run `node scripts/migrate-data-to-supabase.cjs`
3. **Update**: Change imports from `rtdatabase/` to `psql/`
4. **Test**: Verify all functionality works
5. **Cutover**: Switch `VITE_DATA_PROVIDER=supabase`

This approach provides a clean, one-time migration with minimal risk and maximum control over the process.
