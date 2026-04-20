'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app';
import { supabase, Profile } from '@/lib/supabase';

export default function FriendsTab() {
  const { me, friends } = useApp();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!me) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const add = params.get('add');
    if (add && add.length === 6) {
      setCode(add.toUpperCase());
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [me?.id]);

  async function add() {
    if (!me) return;
    const c = code.trim().toUpperCase();
    setErr('');
    setMsg('');
    if (c.length !== 6) return setErr('code must be 6 chars');
    if (c === me.friend_code) return setErr('cannot add yourself');
    setBusy(true);
    const { data: other, error: fetchErr } = await supabase
      .from('profiles').select('*').eq('friend_code', c).maybeSingle();
    if (fetchErr) { setErr(fetchErr.message); setBusy(false); return; }
    if (!other) { setErr('no user found with that code'); setBusy(false); return; }

    const otherId = (other as Profile).id;
    const { data: existing } = await supabase
      .from('friends').select('user_id, friend_id')
      .or(`and(user_id.eq.${me.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${me.id})`)
      .limit(1);
    if (existing && existing.length > 0) {
      setMsg(`already friends with ${(other as Profile).name}`);
      setCode('');
      setBusy(false);
      return;
    }

    const { error: insErr } = await supabase
      .from('friends').insert({ user_id: me.id, friend_id: otherId });
    if (insErr) { setErr(insErr.message); setBusy(false); return; }
    setMsg(`added ${(other as Profile).name}`);
    setCode('');
    setBusy(false);
  }

  async function copyCode() {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function shareCode() {
    if (!me) return;
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/?add=${me.friend_code}`
      : '';
    const text = `add me on pop in — code ${me.friend_code}\n${url}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Pop In', text, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function remove(id: string) {
    if (!me) return;
    await supabase.from('friends').delete().eq('user_id', me.id).eq('friend_id', id);
    await supabase.from('friends').delete().eq('user_id', id).eq('friend_id', me.id);
  }

  if (!me) return null;

  return (
    <>
      <div className="header"><div className="header-title">{'> FRIENDS'}</div></div>
      <div className="content">
        <div style={{ padding: 16, borderBottom: '1px solid var(--dark)' }}>
          <div className="label">{'> YOUR CODE'}</div>
          <div onClick={copyCode} style={{ fontSize: 28, letterSpacing: 6, fontWeight: 'bold', cursor: 'pointer', padding: '12px 0' }}>{me.friend_code}</div>
          <button onClick={shareCode} className="btn" style={{ marginTop: 8 }}>
            {copied ? '> COPIED!' : '> SHARE CODE'}
          </button>
          <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            {'> tap SHARE to text a link. friend taps it → their code field auto-fills'}
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--dark)' }}>
          <div className="label">{'> ADD BY CODE'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              autoCapitalize="characters"
              style={{ flex: 1, letterSpacing: 4, textAlign: 'center', fontSize: 20 }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button onClick={add} disabled={busy} style={{ borderLeft: '1px solid var(--green)', padding: '0 20px', color: 'var(--green)', fontSize: 20 }}>{'>'}</button>
          </div>
          {err && <div className="err">{'> '}{err}</div>}
          {msg && <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 12 }}>{'> '}{msg}</div>}
        </div>

        {friends.length === 0 ? (
          <div className="empty">
            <div className="empty-title">{'> NO FRIENDS YET'}</div>
            <div className="empty-body">{'> tap SHARE CODE above and text it to a friend'}</div>
          </div>
        ) : (
          <div>
            <div style={{ padding: '16px 16px 8px', color: 'var(--dim)', fontSize: 11, letterSpacing: 1 }}>{'> '}{friends.length}{' FRIEND'}{friends.length !== 1 ? 'S' : ''}</div>
            {friends.map((f) => (
              <div key={f.id} className="row">
                <div className="avatar-md">
                  {f.avatar ? <img src={f.avatar} alt="" /> : (f.name[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="row-name">{f.name}</div>
                  {f.status ? <div className="row-sub">{'> '}{f.status}</div> : null}
                </div>
                <button onClick={() => remove(f.id)} style={{ color: 'var(--red)', fontSize: 20, padding: 8 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
