import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { friendlyError, supabase } from './supabase';

export type AuthStatus = 'loading' | 'signed-out' | 'not-admin' | 'admin' | 'recovery';

interface AuthState {
  status: AuthStatus;
  email: string | null;
  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

let started = false;

async function isAdmin(session: Session) {
  const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return !!data;
}

export const useAuth = create<AuthState>((set, get) => {
  const evaluate = async (session: Session | null) => {
    if (!session) return set({ status: 'signed-out', email: null });
    set({ email: session.user.email ?? null });
    try {
      set({ status: (await isAdmin(session)) ? 'admin' : 'not-admin' });
    } catch {
      set({ status: 'not-admin' });
    }
  };

  return {
    status: 'loading',
    email: null,

    init: () => {
      if (started) return;
      started = true;
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') return set({ status: 'recovery', email: session?.user.email ?? null });
        if (get().status === 'recovery' && event !== 'SIGNED_OUT') return;
        // defer: Supabase recommends not awaiting other calls inside this callback
        setTimeout(() => evaluate(session), 0);
      });
    },

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(friendlyError(error));
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set({ status: 'signed-out', email: null });
    },

    sendReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw new Error(friendlyError(error));
    },

    updatePassword: async (password) => {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(friendlyError(error));
      set({ status: 'loading' });
      const { data: s } = await supabase.auth.getSession();
      await evaluate(s.session ?? (data.user ? (await supabase.auth.getSession()).data.session : null));
    },
  };
});
