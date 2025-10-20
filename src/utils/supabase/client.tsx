import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

const supabaseKey = publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);