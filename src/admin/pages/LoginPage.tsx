import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { Alert, Field } from '../ui';
import { Button } from '../../components/ui/Button';
import { siteConfig } from '../../config/site';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f0ea] px-4 py-12">
      <div className="w-full max-w-md border border-line bg-white p-7 shadow-[var(--shadow-soft)] sm:p-10">
        <p className="font-serif text-3xl tracking-[0.32em]">{siteConfig.logoText}</p>
        <p className="mt-1 text-xs font-semibold tracking-[0.2em] text-gold-dark uppercase">Catalogue admin</p>
        <h1 className="mt-8 text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { status, email: currentEmail, signIn, signOut, sendReset, updatePassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'not-admin')
    return (
      <Shell title="No admin access" subtitle={`You are signed in as ${currentEmail ?? 'this account'}.`}>
        <Alert>
          This account is not on the admin list, so it cannot manage the catalogue. Ask the site owner to add you, or sign in
          with a different account.
        </Alert>
        <Button className="mt-6 w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </Shell>
    );

  if (status === 'recovery')
    return (
      <Shell title="Choose a new password" subtitle="Use at least 8 characters. A short phrase is easiest to remember.">
        <form
          className="space-y-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (password.length < 8) return setError('Please use at least 8 characters.');
            if (password !== password2) return setError('The two passwords do not match.');
            run(() => updatePassword(password));
          }}
        >
          <Field label="New password" required>
            {(p) => <input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Repeat new password" required>
            {(p) => <input {...p} type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />}
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </Shell>
    );

  if (mode === 'forgot')
    return (
      <Shell title="Reset your password" subtitle="We’ll email you a link to choose a new password.">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await sendReset(email);
              setNotice('If that email belongs to an account, a reset link is on its way. Check your inbox (and spam folder).');
            });
          }}
        >
          <Field label="Email" required>
            {(p) => <input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          {error && <Alert>{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          <button type="button" onClick={() => setMode('login')} className="block w-full text-center text-sm text-muted hover:text-charcoal">
            ← Back to sign in
          </button>
        </form>
      </Shell>
    );

  return (
    <Shell title="Sign in" subtitle="For authorised staff only.">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => signIn(email, password));
        }}
      >
        <Field label="Email" required>
          {(p) => <input {...p} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" required>
          {(p) => <input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <button type="button" onClick={() => setMode('forgot')} className="block w-full text-center text-sm text-muted hover:text-charcoal">
          Forgot your password?
        </button>
      </form>
    </Shell>
  );
}
