import { supabase } from './supabase';

export async function signInWithMagicLink(email: string) {
  // Envoie un email contenant un lien + un code OTP
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: 'pm://auth' }
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email' // code OTP depuis l'email
  });
  if (error) throw error;
  return data.session ?? null;
}

export async function setSessionFromDeepLink(url: string) {
  // Format attendu: pm://auth#access_token=...&refresh_token=...
  try {
    const u = new URL(url);
    const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return data.session ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

export function onAuth(cb: (hasSession: boolean)=>void) {
  supabase.auth.onAuthStateChange((_e, session) => cb(!!session));
}

export async function signOut() {
  await supabase.auth.signOut();
}
