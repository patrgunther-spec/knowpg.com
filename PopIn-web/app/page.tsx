'use client';
import { useState } from 'react';
import { useApp } from '@/lib/app';
import Welcome from '@/components/welcome';
import HomeTab from '@/components/home-tab';
import FriendsTab from '@/components/friends-tab';
import InboxTab from '@/components/inbox-tab';
import BulletinTab from '@/components/bulletin-tab';
import Chat from '@/components/chat';
import ProfileScreen from '@/components/profile-screen';

type Screen =
  | { type: 'tabs' }
  | { type: 'chat'; friendId: string }
  | { type: 'profile' };

export default function Page() {
  const { me, session, loading, configured } = useApp();
  const [tab, setTab] = useState<'map' | 'inbox' | 'bulletin' | 'friends'>('map');
  const [screen, setScreen] = useState<Screen>({ type: 'tabs' });

  if (!configured) {
    return (
      <div className="page">
        <div className="center" style={{ flexDirection: 'column', textAlign: 'center' }}>
          <div style={{ color: 'var(--red)', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>{'> BACKEND NOT CONFIGURED'}</div>
          <div style={{ color: 'var(--green)', fontSize: 13, lineHeight: 1.8 }}>
            {'> set NEXT_PUBLIC_SUPABASE_URL'}<br />
            {'> set NEXT_PUBLIC_SUPABASE_ANON_KEY'}<br />
            {'> in Vercel env vars or .env.local'}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="page"><div className="center">{'> INITIALIZING...'}</div></div>;
  }

  if (!session || !me) {
    return <div className="page"><Welcome /></div>;
  }

  if (screen.type === 'chat') {
    return <Chat friendId={screen.friendId} onBack={() => setScreen({ type: 'tabs' })} />;
  }

  if (screen.type === 'profile') {
    return <ProfileScreen onBack={() => setScreen({ type: 'tabs' })} />;
  }

  return (
    <div className="page">
      {tab === 'map' && <HomeTab onOpenProfile={() => setScreen({ type: 'profile' })} />}
      {tab === 'inbox' && <InboxTab onOpen={(id) => setScreen({ type: 'chat', friendId: id })} />}
      {tab === 'bulletin' && <BulletinTab />}
      {tab === 'friends' && <FriendsTab />}

      <div className="tabs">
        <div className={`tab ${tab === 'map' ? 'active' : ''}`} onClick={() => setTab('map')}>MAP</div>
        <div className={`tab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>INBOX</div>
        <div className={`tab ${tab === 'bulletin' ? 'active' : ''}`} onClick={() => setTab('bulletin')}>BULLETIN</div>
        <div className={`tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>FRIENDS</div>
      </div>
    </div>
  );
}
