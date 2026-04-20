'use client';
import { useRef, useState } from 'react';
import { useApp } from '@/lib/app';

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { me, updateMe, signOut } = useApp();
  const [name, setName] = useState(me?.name ?? '');
  const [status, setStatus] = useState(me?.status ?? '');
  const [website, setWebsite] = useState(me?.website ?? '');
  const [home, setHome] = useState(me?.home_location ?? '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!me) return null;

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await updateMe({ avatar: reader.result as string });
    };
    reader.readAsDataURL(f);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await updateMe({
      name: name.trim(),
      status: status.trim(),
      website: website.trim(),
      home_location: home.trim(),
    });
    setSaving(false);
    onBack();
  }

  return (
    <div className="page">
      <div className="header">
        <div className="header-row">
          <button onClick={onBack} style={{ color: 'var(--green)', fontSize: 14 }}>{'< BACK'}</button>
          <div className="header-title">{'> PROFILE'}</div>
        </div>
      </div>

      <div className="content" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div onClick={() => fileRef.current?.click()} style={{ display: 'inline-block', cursor: 'pointer' }}>
            <div className="avatar-lg">
              {me.avatar ? <img src={me.avatar} alt="" /> : (me.name[0] || '?').toUpperCase()}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
          <div style={{ color: 'var(--dim)', fontSize: 11, marginTop: 8 }}>{'> TAP TO CHANGE'}</div>
        </div>

        <div className="label">{'> HANDLE'}</div>
        <input value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="none" style={{ marginBottom: 20 }} />

        <div className="label">{'> STATUS'}</div>
        <input placeholder="what are you up to..." value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginBottom: 20 }} />

        <div className="label">{'> HOME LOCATION'}</div>
        <input placeholder="brooklyn, ny..." value={home} onChange={(e) => setHome(e.target.value)} style={{ marginBottom: 20 }} />

        <div className="label">{'> WEBSITE'}</div>
        <input placeholder="yoursite.com..." type="url" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ marginBottom: 28 }} />

        <div style={{ border: '1px solid var(--dark)', padding: 16, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--dim)', fontSize: 12 }}>{'> FRIEND CODE'}</div>
          <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 4 }}>{me.friend_code}</div>
        </div>

        <button className="btn" onClick={save} disabled={saving} style={{ padding: 18, fontSize: 18, marginBottom: 12 }}>
          {saving ? '> SAVING...' : '> SAVE'}
        </button>
        <button onClick={async () => { if (confirm('sign out?')) await signOut(); }}
                style={{ padding: 16, color: 'var(--dim)', fontSize: 13, width: '100%' }}>
          {'> SIGN OUT'}
        </button>
      </div>
    </div>
  );
}
