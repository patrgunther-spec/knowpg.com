'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app';

export default function Welcome() {
  const { signUp, signIn } = useApp();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('popin.pendingFriendCode')) setInvited(true);
    } catch {}
  }, []);

  async function go() {
    if (busy) return;
    setErr('');
    setBusy(true);
    const e = mode === 'signup'
      ? await signUp(email, password, name)
      : await signIn(email, password);
    if (e) setErr(e);
    setBusy(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 42, fontWeight: 'bold', marginBottom: 4 }}>{'> POP IN'}</div>
      <div style={{ color: 'var(--dim)', fontSize: 14, marginBottom: invited ? 24 : 40 }}>v1.0.0 beta</div>

      {invited && (
        <div style={{
          border: '1px solid var(--green)', padding: 14, marginBottom: 24,
          background: '#001a00', color: 'var(--green)', fontSize: 13, lineHeight: 1.5,
        }}>
          {'> A FRIEND INVITED YOU'}
          <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 6, letterSpacing: 0.5 }}>
            sign up and they'll be added to your friends list automatically
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid var(--dark)' }}>
        <button
          onClick={() => { setMode('signup'); setErr(''); }}
          style={{
            flex: 1, padding: 12, fontSize: 13, letterSpacing: 2, fontWeight: 'bold',
            background: mode === 'signup' ? '#001a00' : 'transparent',
            color: mode === 'signup' ? 'var(--green)' : 'var(--dim)',
            borderRight: '1px solid var(--dark)',
          }}
        >SIGN UP</button>
        <button
          onClick={() => { setMode('login'); setErr(''); }}
          style={{
            flex: 1, padding: 12, fontSize: 13, letterSpacing: 2, fontWeight: 'bold',
            background: mode === 'login' ? '#001a00' : 'transparent',
            color: mode === 'login' ? 'var(--green)' : 'var(--dim)',
          }}
        >LOG IN</button>
      </div>

      {mode === 'signup' && (
        <>
          <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>{'> NAME'}</div>
          <input
            placeholder="your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoCapitalize="words"
            style={{ marginBottom: 16 }}
            disabled={busy}
          />
        </>
      )}

      <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>{'> EMAIL'}</div>
      <input
        placeholder="you@example.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoCapitalize="none"
        autoComplete="email"
        style={{ marginBottom: 16 }}
        disabled={busy}
      />

      <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>{'> PASSWORD'}</div>
      <input
        placeholder={mode === 'signup' ? '6+ characters' : 'your password'}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        style={{ marginBottom: 24 }}
        disabled={busy}
      />

      <button className="btn" onClick={go} disabled={busy}>
        {busy ? '> CONNECTING...' : (mode === 'signup' ? '> CREATE ACCOUNT' : '> LOG IN')}
      </button>

      {err && <div className="err">{'> '}{err}</div>}
    </div>
  );
}
