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
  const [focusId, setFocusId] = useState<string | null>(null);

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
            <div style={{ color: me.status ? 'var(--green)' : 'var(--dim)', fontSize: 12, marginTop: 4, opacity: 0.7 }}>
              {me.status ? `> ${me.status}` : '> tap to edit profile'}
            </div>
          </div>
          <div style={{ color: 'var(--dim)', fontSize: 16 }}>{'>'}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Map me={me} friends={friends} focusId={focusId} onFocused={() => setFocusId(null)} />
      </div>

      {friends.length > 0 && (
        <div style={{ maxHeight: '28vh', overflowY: 'auto', borderTop: '1px solid var(--dark)', background: 'var(--bg)' }}>
          <div style={{
            padding: '8px 16px', color: 'var(--dim)', fontSize: 11, letterSpacing: 1, fontWeight: 'bold',
            borderBottom: '1px solid var(--dark)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{'> PEOPLE'}</span>
            <span>{friends.length}</span>
          </div>
          {friends.map((f) => {
            const hasLoc = f.lat != null && f.lng != null;
            return (
              <div key={f.id} onClick={() => hasLoc && setFocusId(f.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                  borderBottom: '1px solid var(--dark)', cursor: hasLoc ? 'pointer' : 'default' }}>
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                  <div className="avatar-sm">
                    {f.avatar ? <img src={f.avatar} alt="" /> : (f.name[0] || '?').toUpperCase()}
                  </div>
                  {hasLoc && (
                    <div style={{
                      position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
                      borderRadius: '50%', background: 'var(--green)', border: '1px solid #000',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 13 }}>{f.name}</div>
                  <div style={{ color: 'var(--dim)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.status ? `> ${f.status}` : hasLoc ? '> location available' : '> no location'}
                  </div>
                </div>
                {hasLoc && <div style={{ color: 'var(--dim)', fontSize: 14 }}>{'>'}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: 12, borderTop: '1px solid var(--dark)', background: 'var(--bg)' }}>
        {me.status ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--dim)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {'> '}{me.status}
            </div>
            <button onClick={() => { setStatus(me.status); setModal(true); }}
              style={{ border: '1px solid var(--green)', color: 'var(--green)', padding: '8px 12px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
              EDIT
            </button>
            <button onClick={() => updateMe({ status: '' })}
              style={{ border: '1px solid var(--red)', color: 'var(--red)', padding: '8px 12px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
              END
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setModal(true)} style={{ padding: 14, fontSize: 16 }}>{'> POP IN'}</button>
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
