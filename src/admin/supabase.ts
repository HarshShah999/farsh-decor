import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '../config/site';

/**
 * Supabase client for the admin panel only (the public site uses plain fetch).
 * Uses the publishable key; what a signed-in user may change is enforced by
 * Row Level Security in the database (see supabase/setup.sql).
 */
export const supabase = createClient(siteConfig.supabaseUrl, siteConfig.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'farsh-admin-auth' },
});

export const BUCKET = 'catalog';

/** Turn a Supabase / Postgres error into a plain-English message. */
export function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string; status?: number; statusCode?: string } | null;
  const code = e?.code ?? '';
  const msg = e?.message ?? String(err ?? 'Something went wrong');
  if (code === '23505') return 'That name or web address is already used. Please choose a different one.';
  if (code === '23503') return 'This category still has products. Move or delete those products first.';
  if (code === '42501' || /row-level security|permission denied|Unauthorized/i.test(msg))
    return 'Your account is not allowed to make this change. Please sign in again with an admin account.';
  if (code === 'PGRST205' || /schema cache/i.test(msg))
    return 'The database is not set up yet. Run supabase/setup.sql in the Supabase SQL Editor first.';
  if (/Bucket not found/i.test(msg)) return 'Photo storage is not set up yet. Run supabase/setup.sql in the Supabase SQL Editor.';
  if (/payload too large|exceeded the maximum allowed size/i.test(msg)) return 'That photo is too large (maximum 10 MB).';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Could not reach the server. Check your internet connection and try again.';
  if (/Invalid login credentials/i.test(msg)) return 'Email or password is incorrect.';
  if (/Email not confirmed/i.test(msg)) return 'This email address has not been confirmed yet.';
  return msg;
}
