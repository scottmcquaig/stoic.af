-- ============================================
-- COMPLETE DATABASE SETUP FOR STOIC AF
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Drop existing table if you need to start fresh (uncomment if needed)
-- DROP TABLE IF EXISTS public.kv_store_6d6f37b2;

-- ============================================
-- 1. Create the KV Store table (REQUIRED)
-- ============================================

CREATE TABLE IF NOT EXISTS public.kv_store_6d6f37b2 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON public.kv_store_6d6f37b2(key);
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON public.kv_store_6d6f37b2(key text_pattern_ops);

-- ============================================
-- 2. Create auto-update trigger for updated_at
-- ============================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_kv_store_updated_at_trigger ON public.kv_store_6d6f37b2;

-- Create the trigger
CREATE TRIGGER update_kv_store_updated_at_trigger
    BEFORE UPDATE ON public.kv_store_6d6f37b2
    FOR EACH ROW
    EXECUTE FUNCTION update_kv_store_updated_at();

-- ============================================
-- 3. Set up permissions
-- ============================================

-- Grant all permissions to postgres user (admin)
GRANT ALL ON public.kv_store_6d6f37b2 TO postgres;

-- Grant all permissions to service_role (for Edge Functions)
GRANT ALL ON public.kv_store_6d6f37b2 TO service_role;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kv_store_6d6f37b2 TO authenticated;

-- Grant read permissions to anonymous users
GRANT SELECT ON public.kv_store_6d6f37b2 TO anon;

-- ============================================
-- 4. Add helpful comments
-- ============================================

COMMENT ON TABLE public.kv_store_6d6f37b2 IS 'Key-Value store for Stoic AF application data';
COMMENT ON COLUMN public.kv_store_6d6f37b2.key IS 'Unique key identifier (e.g., profile:userId, purchases:userId, journal:userId:trackName)';
COMMENT ON COLUMN public.kv_store_6d6f37b2.value IS 'JSON data associated with the key';
COMMENT ON COLUMN public.kv_store_6d6f37b2.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.kv_store_6d6f37b2.updated_at IS 'Timestamp when the record was last updated';

-- ============================================
-- 5. Verify the setup
-- ============================================

-- Test insert
INSERT INTO public.kv_store_6d6f37b2 (key, value)
VALUES ('test:verification', jsonb_build_object('status', 'testing', 'timestamp', NOW()::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Test select
SELECT
  'Table exists and is working!' as status,
  key,
  value,
  created_at
FROM public.kv_store_6d6f37b2
WHERE key = 'test:verification';

-- Test update to verify trigger
UPDATE public.kv_store_6d6f37b2
SET value = jsonb_build_object('status', 'updated', 'timestamp', NOW()::text)
WHERE key = 'test:verification';

-- Verify the updated_at changed
SELECT
  key,
  value,
  created_at,
  updated_at,
  CASE
    WHEN updated_at > created_at THEN 'Trigger is working!'
    ELSE 'Trigger may not be working'
  END as trigger_status
FROM public.kv_store_6d6f37b2
WHERE key = 'test:verification';

-- Clean up test data
DELETE FROM public.kv_store_6d6f37b2 WHERE key = 'test:verification';

-- ============================================
-- 6. Final verification
-- ============================================

-- Check table structure
SELECT
  '✅ Table Structure:' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'kv_store_6d6f37b2'
ORDER BY ordinal_position;

-- Check indexes
SELECT
  '✅ Indexes:' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'kv_store_6d6f37b2';

-- Check permissions
SELECT
  '✅ Permissions:' as check_type,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'kv_store_6d6f37b2'
ORDER BY grantee, privilege_type;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT
  '🎉 SUCCESS!' as status,
  'KV Store table created and ready for use!' as message,
  'You can now deploy your Edge Functions' as next_step;