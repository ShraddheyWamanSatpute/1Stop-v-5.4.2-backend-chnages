# STEP 1: Configure Supabase Environment Variables

## Action Required
Add these to your `.env.local` file:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key  
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Data Provider Selection
VITE_DATA_PROVIDER=supabase
```

## Where to Get These Values

1. **Supabase Project URL**: 
   - Go to your Supabase project dashboard
   - Settings > API > Project URL

2. **Anon Key**:
   - Settings > API > Project API keys > anon public

3. **Service Role Key**:
   - Settings > API > Project API keys > service_role (keep secret!)

## Verification
```bash
# Test environment variables are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

## Next Step
Once environment variables are configured, proceed to STEP 2.
