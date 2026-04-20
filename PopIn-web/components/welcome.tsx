'use client';
import { useState } from 'react';
import { useApp } from '@/lib/app';

export default function Welcome() {
  const { signUp } = useApp();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function go() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr('');
    const e = await signUp(name);
    if (e) setErr(e);
    setBusy(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 42, fontWeight: 'bold', marginBottom: 4 }}>{'> POP IN'}</div>
      <div style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 48 }}>v1.0.0 beta</div>
      <div className="label" style={{ fontSize: 16, marginBottom: 12, color: 'var(--green)' }}>{'> ENTER HANDLE:'}</div>
      <input
        placeholder="your name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        autoCapitalize="none"
        style={{ borderColor: 'var(--green)', marginBottom: 20, fontSize: 18 }}
        disabled={busy}
      />
      <button className="btn" onClick={go} disabled={busy}>
        {busy ? '> CONNECTING...' : '> CONNECT'}
      </button>
      {err && <div className="err">{'> '}{err}</div>}
    </div>
  );
}
