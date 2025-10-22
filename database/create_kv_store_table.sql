-- Create the KV Store table for Stoic AF
-- This table is used by the Edge Functions to store user data, purchases, journal entries, etc.
-- It must be created before the application can function properly.

-- Create the KV Store table
CREATE TABLE IF NOT EXISTS public.kv_store_6d6f37b2 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance on key lookups
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON public.kv_store_6d6f37b2(key);

-- Create index for prefix searches (used by getByPrefix function)
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON public.kv_store_6d6f37b2(key text_pattern_ops);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_kv_store_updated_at_trigger
    BEFORE UPDATE ON public.kv_store_6d6f37b2
    FOR EACH ROW
    EXECUTE FUNCTION update_kv_store_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.kv_store_6d6f37b2 TO postgres;
GRANT ALL ON public.kv_store_6d6f37b2 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kv_store_6d6f37b2 TO authenticated;
GRANT SELECT ON public.kv_store_6d6f37b2 TO anon;

-- Enable Row Level Security (optional - can be disabled if not needed)
-- ALTER TABLE public.kv_store_6d6f37b2 ENABLE ROW LEVEL SECURITY;

-- If RLS is enabled, you'll need policies. For now, we'll keep it simple without RLS
-- since the Edge Functions use the service role key which bypasses RLS anyway.

COMMENT ON TABLE public.kv_store_6d6f37b2 IS 'Key-Value store for Stoic AF application data';
COMMENT ON COLUMN public.kv_store_6d6f37b2.key IS 'Unique key identifier (e.g., profile:userId, purchases:userId, journal:userId:trackName)';
COMMENT ON COLUMN public.kv_store_6d6f37b2.value IS 'JSON data associated with the key';