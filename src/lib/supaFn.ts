import { supabase } from './supabase';

export async function callFn<T = unknown>(name: string, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const url = import.meta.env.VITE_SUPABASE_URL!;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!;
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      apikey: key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}
