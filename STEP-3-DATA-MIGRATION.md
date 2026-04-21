# STEP 3: Run Data Migration from Firebase to Supabase

## Action Required
Execute the data migration script to move all data from Firebase to Supabase.

## Prerequisites
- STEP 1: Environment variables configured
- STEP 2: Database migrations applied
- Firebase project still accessible

## Migration Execution
```bash
# Navigate to backend directory
cd a:\Code\1Stop\Combined\1Stop Final\app\backend

# Run the complete data migration
node scripts/migrate-data-to-supabase.cjs
```

## What the Migration Does
1. **Exports data** from Firebase Realtime Database
2. **Transforms data** from Firebase format to Supabase format
3. **Imports data** into Supabase PostgreSQL tables
4. **Validates data integrity** throughout the process
5. **Generates migration report** with statistics

## Expected Output
```
=== Firebase to Supabase Migration ===
Supabase URL: https://your-project.supabase.co
Firebase Project: your-firebase-project

=== Migrating Supply ===
  Imported 150 records to supply_clients
  Imported 45 records to supply_orders
  ...

=== Migrating Finance ===
  Imported 200 records to finance_accounts
  ...

=== Migration Report ===
Modules: 15/15 (100%)
Records: 5,432/5,432 (100%)
Errors: 0
```

## Data Transformation Rules
- Firebase objects with ID keys become PostgreSQL records
- Nested data stored in JSONB payload column
- Company paths converted to company_id, site_id, subsite_id
- Timestamps preserved as Unix timestamps

## Verification After Migration
```sql
-- Check record counts
SELECT 'supply_clients' as table_name, COUNT(*) as record_count FROM supply_clients
UNION ALL
SELECT 'supply_orders', COUNT(*) FROM supply_orders
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
-- Add more tables as needed
ORDER BY table_name;
```

## Rollback Capability
If migration fails:
```bash
# The script automatically creates backups
# Check migration-report.json for details
# Can rollback to Firebase by setting VITE_DATA_PROVIDER=firebase
```

## Troubleshooting
- **Connection errors**: Check Supabase URL and keys
- **Permission errors**: Verify service role key has proper permissions
- **Data validation errors**: Check transformation rules in migration script

## Next Step
Once data migration completes successfully, proceed to STEP 4.
