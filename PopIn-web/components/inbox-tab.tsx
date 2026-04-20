'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app';
import { supabase, Message, Profile } from '@/lib/supabase';

type Preview = { friend: Profile; last: Message };

export default function InboxTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { me, friends } = useApp();
  const [previews, setPreviews] = useState<Preview[]>([]);

  async function load() {
    if (!me) return;
    const { data } = await supabase.from('messages').select('*')
      .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
      .order('created_at', { ascending: false });
    if (!data) return;
    const seen = new Set<string>();
    const out: Preview[] = [];
    for (const m of (data as Message[])) {
      const otherId = m.sender_id === me.id ? m.recipient_id : m.sender_id;
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      const f = friends.find((x) => x.id === otherId);
      if (f) out.push({ friend: f, last: m });
    }
    setPreviews(out);
  }

  useEffect(() => {
    load();
    if (!me) return;
    const ch = supabase.channel('inbox-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id, friends.length]);

  if (!me) return null;

  return (
    <>
      <div className="header"><div className="header-title">{'> INBOX'}</div></div>
      <div className="content">
        {friends.length === 0 ? (
          <div className="empty">
            <div className="empty-title">{'> NO CONNECTIONS'}</div>
            <div className="empty-body">{'> add friends to start chatting'}</div>
          </div>
        ) : (
          <>
            <div style={{ padding: 16, color: 'var(--dim)', fontSize: 11, letterSpacing: 1 }}>{'> TAP A FRIEND TO CHAT'}</div>
            {friends.map((f) => {
              const p = previews.find((x) => x.friend.id === f.id);
              return (
                <div key={f.id} className="row" onClick={() => onOpen(f.id)} style={{ cursor: 'pointer' }}>
                  <div className="avatar-md">
                    {f.avatar ? <img src={f.avatar} alt="" /> : (f.name[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="row-name">{f.name}</div>
                    <div className="row-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p ? (p.last.sender_id === me.id ? '> you: ' : '> ') + p.last.text : '> no messages yet'}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
