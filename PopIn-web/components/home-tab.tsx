'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/app';

const Map = dynamic(() => import('./map'), { ssr: false, loading: () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
    <div style={{ color: 'var(--green)' }}>{'> LOADING MAP...'}</div>
  </div>
)});

export default function HomeTab({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { me, friends, updateMe } = useApp();
  const [modal, setModal] = useState(false);
  const [status, setStatus] = useState('');

  if (!me) return null;

  return (
    <>
      <div className="header" onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
        <div className="header-row">
          <div className="avatar-sm">
            {me.avatar ? <img src={me.avatar} alt="" /> : (me.name[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div className="header-title">{'> '}{me.name.toUpperCase()}</div>
            <div className={me.status ? 'header-sub' : ''} style={{ color: me.status ? 'var(--green)' : 'var(--dim)', fontSize: 12, marginTop: 4, opacity: me.status ? 0.7 : 1 }}>
              {me.status ? `> ${me.status}` : '> NO STATUS SET'}
            </div>
          </div>
        </div>
      </div>

      <Map me={me} friends={friends} />

      <div style={{ padding: 16, borderTop: '1px solid var(--dark)', background: 'var(--bg)' }}>
        {me.status ? (
          <>
            <div className="label">{'> BROADCASTING:'}</div>
            <div style={{ fontSize: 14, marginBottom: 12 }}>{me.status}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" onClick={() => { setStatus(me.status); setModal(true); }}>{'> UPDATE'}</button>
              <button className="btn btn-danger" onClick={() => updateMe({ status: '' })}>{'> END'}</button>
            </div>
          </>
        ) : (
          <button className="btn" onClick={() => setModal(true)} style={{ padding: 18, fontSize: 18 }}>{'> POP IN'}</button>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', padding: 28, paddingTop: 60, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 24 }}>{'> WHAT ARE YOU UP TO?'}</div>
          <textarea
            placeholder="Going for a run in Prospect Park..."
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            autoFocus
            rows={3}
            style={{ borderColor: 'var(--green)', marginBottom: 20, resize: 'none' }}
          />
          <button className="btn" onClick={() => {
            const v = status.trim();
            if (!v) return;
            updateMe({ status: v });
            setStatus('');
            setModal(false);
          }} style={{ marginBottom: 12 }}>{'> BROADCAST'}</button>
          <button onClick={() => setModal(false)} style={{ padding: 18, color: 'var(--dim)', fontSize: 16 }}>{'> CANCEL'}</button>
        </div>
      )}
    </>
  );
}
