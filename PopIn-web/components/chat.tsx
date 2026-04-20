'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/app';
import { supabase, Message } from '@/lib/supabase';

export default function Chat({ friendId, onBack }: { friendId: string; onBack: () => void }) {
  const { me, friends } = useApp();
  const friend = friends.find((f) => f.id === friendId);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!me) return;
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${me.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${me.id})`)
      .order('created_at', { ascending: true });
    if (data) setMsgs(data as Message[]);
  }

  useEffect(() => {
    if (!me) return;
    load();
    const ch = supabase.channel(`chat-${me.id}-${friendId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        const m = p.new as Message;
        const inThis = (m.sender_id === me.id && m.recipient_id === friendId) ||
                       (m.sender_id === friendId && m.recipient_id === me.id);
        if (inThis) setMsgs((prev) => [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id, friendId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t || !me) return;
    setText('');
    await supabase.from('messages').insert({ sender_id: me.id, recipient_id: friendId, text: t });
  }

  if (!me || !friend) {
    return (
      <div className="page">
        <div className="center">
          <button className="btn" onClick={onBack}>{'< BACK'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <div className="header-row">
          <button onClick={onBack} style={{ color: 'var(--green)', fontSize: 13 }}>{'< BACK'}</button>
          <div className="avatar-sm">
            {friend.avatar ? <img src={friend.avatar} alt="" /> : (friend.name[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>{friend.name}</div>
            {friend.status ? <div style={{ fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{'> '}{friend.status}</div> : null}
          </div>
        </div>
      </div>

      <div className="content" style={{ padding: 12 }}>
        {msgs.length === 0 ? (
          <div style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>{'> no messages. say hi.'}</div>
        ) : msgs.map((m) => {
          const mine = m.sender_id === me.id;
          return (
            <div key={m.id} style={{
              marginBottom: 6, padding: 10, maxWidth: '80%', border: '1px solid',
              borderColor: mine ? 'var(--green)' : 'var(--dark)',
              background: mine ? '#001a00' : '#000',
              alignSelf: mine ? 'flex-end' : 'flex-start',
              marginLeft: mine ? 'auto' : 0, marginRight: mine ? 0 : 'auto',
              width: 'fit-content',
            }}>
              <div style={{ fontSize: 14 }}>{m.text}</div>
              <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 4, textAlign: mine ? 'right' : 'left' }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', padding: 10, gap: 8, borderTop: '1px solid var(--dark)', paddingBottom: `max(10px, env(safe-area-inset-bottom))` }}>
        <input
          placeholder="type..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          autoCapitalize="none"
          style={{ flex: 1 }}
        />
        <button onClick={send} style={{ width: 44, border: '1px solid var(--green)', color: 'var(--green)', fontSize: 20, fontWeight: 'bold' }}>{'>'}</button>
      </div>
    </div>
  );
}
