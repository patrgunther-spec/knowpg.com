'use client';
import { useState } from 'react';
import { useApp } from '@/lib/app';

export default function FriendsTab() {
  const { me, friends, incoming, outgoing, sendRequest, acceptRequest, declineRequest, removeFriend, cancelRequest } = useApp();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!me || busy) return;
    setErr(''); setMsg(''); setBusy(true);
    const res = await sendRequest(code);
    if (res.error) setErr(res.error);
    if (res.ok) { setMsg(res.ok); setCode(''); }
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
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?add=${me.friend_code}` : '';
    const text = `join me on pop in: ${url}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: 'Pop In', text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  if (!me) return null;

  return (
    <>
      <div className="header"><div className="header-title">{'> FRIENDS'}</div></div>
      <div className="content">
        <div style={{ padding: 16, borderBottom: '1px solid var(--dark)' }}>
          <button onClick={shareCode} className="btn" style={{ padding: 18, fontSize: 18 }}>
            {copied ? '> LINK COPIED!' : '> INVITE A FRIEND'}
          </button>
          <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 10, lineHeight: 1.5, textAlign: 'center' }}>
            {'> sends them a link. they tap it → request sent → you approve each other.'}
          </div>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--dark)' }}>
          <div className="label">{'> YOUR CODE'}</div>
          <div onClick={copyCode} style={{ fontSize: 28, letterSpacing: 6, fontWeight: 'bold', cursor: 'pointer', padding: '8px 0' }}>
            {me.friend_code}
          </div>
          <div style={{ color: 'var(--dim)', fontSize: 11 }}>{'> tap to copy'}</div>
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
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button onClick={submit} disabled={busy} style={{ borderLeft: '1px solid var(--green)', padding: '0 20px', color: 'var(--green)', fontSize: 20 }}>{'>'}</button>
          </div>
          {err && <div className="err">{'> '}{err}</div>}
          {msg && <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 12 }}>{'> '}{msg}</div>}
        </div>

        {incoming.length > 0 && (
          <div>
            <div style={{ padding: '16px 16px 8px', color: 'var(--green)', fontSize: 11, letterSpacing: 1, fontWeight: 'bold' }}>
              {'> '}{incoming.length}{' FRIEND REQUEST'}{incoming.length !== 1 ? 'S' : ''}
            </div>
            {incoming.map((f) => (
              <div key={f.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar-md">
                    {f.avatar ? <img src={f.avatar} alt="" /> : (f.name[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="row-name">{f.name}</div>
                    <div className="row-sub">{'> wants to be friends'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => acceptRequest(f.id)} style={{ padding: 12, fontSize: 14 }}>{'> APPROVE'}</button>
                  <button className="btn btn-danger" onClick={() => declineRequest(f.id)} style={{ padding: 12, fontSize: 14 }}>{'> DECLINE'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {outgoing.length > 0 && (
          <div>
            <div style={{ padding: '16px 16px 8px', color: 'var(--dim)', fontSize: 11, letterSpacing: 1 }}>
              {'> '}{outgoing.length}{' PENDING'}
            </div>
            {outgoing.map((f) => (
              <div key={f.id} className="row">
                <div className="avatar-md" style={{ opacity: 0.6 }}>
                  {f.avatar ? <img src={f.avatar} alt="" /> : (f.name[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="row-name" style={{ color: 'var(--dim)' }}>{f.name}</div>
                  <div className="row-sub">{'> waiting for approval...'}</div>
                </div>
                <button onClick={() => cancelRequest(f.id)} style={{ color: 'var(--red)', fontSize: 20, padding: 8 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {friends.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
          <div className="empty">
            <div className="empty-title">{'> NO FRIENDS YET'}</div>
            <div className="empty-body">{'> tap INVITE A FRIEND above or enter their code'}</div>
          </div>
        ) : friends.length > 0 ? (
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
                <button onClick={() => removeFriend(f.id)} style={{ color: 'var(--red)', fontSize: 20, padding: 8 }}>×</button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
