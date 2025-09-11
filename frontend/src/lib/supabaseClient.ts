import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise use fallback values
// You should replace these fallbacks with your actual Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cwejlsdpeaqxvpothpbn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZWpsc2RwZWFxeHZwb3RocGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTYwNzgsImV4cCI6MjA3MDY3MjA3OH0.XLdPaAFhEX_Y49z0RBOztH96SZiROkpYDEmb_Q7yl80';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);