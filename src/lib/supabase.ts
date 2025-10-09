import { createClient } from '@supabase/supabase-js';

console.log('VITE_SUPABASE_URL =', import.meta.env.VITE_SUPABASE_URL);

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  throw new Error(
    'Env manquante: définis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local à la racine, puis relance npm run dev.'
  );
}

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
