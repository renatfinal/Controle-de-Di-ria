import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://mock.supabase.co';
}
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'mock-key';

if (supabaseUrl === 'https://mock.supabase.co') {
  console.warn('Variáveis de ambiente do Supabase não configuradas (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
