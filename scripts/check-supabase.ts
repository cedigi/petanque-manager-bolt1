import { supabase } from '../src/lib/supabase';
import { loadLicenseCards } from '../src/services/license';

(async () => {
  // simple ping RLS
  const { data, error } = await supabase.from('licenses').select('*').limit(1);
  console.log('RLS ping error?', error?.message ?? 'ok');

  // functions
  try {
    const s = await loadLicenseCards();
    console.log('license-status:', s);
  } catch (e:any) {
    console.error('fn error', e.message);
  }
})();
