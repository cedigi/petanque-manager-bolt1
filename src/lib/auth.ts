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

export function parseTokensFromDeepLink(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
    const params = new URLSearchParams(hash);
    return {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token')
    };
  } catch {
    return { access_token: null, refresh_token: null };
  }
}

export async function setSessionFromDeepLink(url: string) {
  const { access_token, refresh_token } = parseTokensFromDeepLink(url);
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session ?? null;
  }
  return null;
}

export function onAuth(cb: (hasSession: boolean)=>void) {
  supabase.auth.onAuthStateChange((_e, session) => cb(!!session));
}

export async function signOut() {
  await supabase.auth.signOut();
}
