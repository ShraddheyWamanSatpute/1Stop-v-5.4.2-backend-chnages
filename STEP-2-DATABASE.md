# STEP 2: Apply Database Migrations to Supabase

## Action Required
Apply all 13 database migrations to your Supabase project.

## Method 1: Using Supabase CLI (Recommended)
```bash
# Navigate to your project root
cd a:\Code\1Stop\Combined\1Stop Final

# Apply all migrations
supabase db push

# Or apply specific migration files
supabase db push supabase/migrations/20260331_supply.sql
supabase db push supabase/migrations/20260331_company_core.sql
# ... continue for all 13 files
```

## Method 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file content:
   - `supabase/migrations/20260331_admin_core.sql`
   - `supabase/migrations/20260331_bookings_core.sql`
   - `supabase/migrations/20260331_company_core.sql`
   - `supabase/migrations/20260331_finance_core.sql`
   - `supabase/migrations/20260331_finance_journals_core.sql`
   - `supabase/migrations/20260331_hr_core.sql`
   - `supabase/migrations/20260331_location_product_core.sql`
   - `supabase/migrations/20260331_messenger_core.sql`
   - `supabase/migrations/20260331_notifications_core.sql`
   - `supabase/migrations/20260331_pos_core.sql`
   - `supabase/migrations/20260331_settings_core.sql`
   - `supabase/migrations/20260331_stock_core.sql`
   - `supabase/migrations/20260331_supply.sql`

## Verification
```sql
-- Test that tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables include:
- companies, company_permissions, company_configs, etc.
- supply_clients, supply_orders, supply_deliveries, etc.
- finance_accounts, finance_transactions, etc.
- All other domain tables

## Next Step
Once database schema is ready, proceed to STEP 3.
