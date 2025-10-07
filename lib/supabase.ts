import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgxcuvkvizjkteavrzkl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneGN1dmt2aXpqa3RlYXZyemtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDEzMTEsImV4cCI6MjA3NTI3NzMxMX0.Laam7WJMfI-aBUQXfAD1vPmCl7P48LaeFS4UGWo8Jts';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
