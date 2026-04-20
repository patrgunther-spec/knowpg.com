'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/app';
import { supabase, Plan } from '@/lib/supabase';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function BulletinTab() {
  const { me, friends } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('plans').select('*').order('date', { ascending: true });
      if (data) setPlans(data as Plan[]);
    }
    load();
    const ch = supabase.channel('plans-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const plansByDate = useMemo(() => {
    const map: Record<string, Plan[]> = {};
    for (const p of plans) (map[p.date] ??= []).push(p);
    return map;
  }, [plans]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedPlans = (plansByDate[selectedDate] ?? []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const creatorName = (id: string) => id === me?.id ? me.name : friends.find((f) => f.id === id)?.name ?? '?';

  const weeks: number[][] = [];
  let wk: number[] = Array(firstDow).fill(0);
  for (let d = 1; d <= daysInMonth; d++) {
    wk.push(d);
    if (wk.length === 7) { weeks.push(wk); wk = []; }
  }
  if (wk.length) { while (wk.length < 7) wk.push(0); weeks.push(wk); }

  async function post() {
    if (!title.trim() || !me) return;
    await supabase.from('plans').insert({
      creator_id: me.id, title: title.trim(), date: selectedDate, time: time.trim(), note: note.trim(),
    });
    setTitle(''); setTime(''); setNote('');
    setModal(false);
  }

  async function del(id: string) {
    if (confirm('delete plan?')) await supabase.from('plans').delete().eq('id', id);
  }

  if (!me) return null;

  return (
    <>
      <div className="header"><div className="header-title">{'> BULLETIN'}</div></div>
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--dark)' }}>
          <button onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
            else setViewMonth(viewMonth - 1);
          }} style={{ border: '1px solid var(--green)', color: 'var(--green)', padding: 8, minWidth: 36, fontSize: 18, fontWeight: 'bold' }}>{'<'}</button>
          <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 2 }}>{MONTHS[viewMonth]} {viewYear}</div>
          <button onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
            else setViewMonth(viewMonth + 1);
          }} style={{ border: '1px solid var(--green)', color: 'var(--green)', padding: 8, minWidth: 36, fontSize: 18, fontWeight: 'bold' }}>{'>'}</button>
        </div>

        <div style={{ display: 'flex' }}>
          {DAYS.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: 8, color: 'var(--dim)', fontSize: 11, letterSpacing: 1 }}>{d}</div>
          ))}
        </div>

        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: 'flex' }}>
            {w.map((d, di) => {
              if (!d) return <div key={di} style={{ flex: 1, aspectRatio: '1', border: '0.5px solid var(--dark)' }} />;
              const iso = toISO(viewYear, viewMonth, d);
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDate;
              const has = !!plansByDate[iso]?.length;
              return (
                <div key={di} onClick={() => setSelectedDate(iso)} style={{
                  flex: 1, aspectRatio: '1', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  border: '0.5px solid', borderColor: isSelected ? 'var(--green)' : 'var(--dark)',
                  background: isSelected ? '#001a00' : 'transparent',
                }}>
                  <div style={{ fontSize: 14, fontWeight: isToday ? 'bold' : 'normal', textDecoration: isToday ? 'underline' : 'none' }}>{d}</div>
                  {has && <div style={{ width: 4, height: 4, background: 'var(--green)', marginTop: 2 }} />}
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>{'> '}{selectedDate}</div>
          <button onClick={() => setModal(true)} style={{ border: '1px solid var(--green)', color: 'var(--green)', padding: '6px 12px', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>{'+ POST'}</button>
        </div>

        {selectedPlans.length === 0 ? (
          <div style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center', padding: 24 }}>{'> no plans'}</div>
        ) : selectedPlans.map((p) => (
          <div key={p.id} onContextMenu={(e) => { e.preventDefault(); if (p.creator_id === me.id) del(p.id); }}
               style={{ margin: '0 16px 10px', padding: 14, border: '1px solid var(--dark)', background: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{p.time || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>{creatorName(p.creator_id)}</div>
            </div>
            <div style={{ fontSize: 15, marginBottom: 4 }}>{p.title}</div>
            {p.note && <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>{p.note}</div>}
            {p.creator_id === me.id && (
              <button onClick={() => del(p.id)} style={{ color: 'var(--red)', fontSize: 11, marginTop: 8 }}>{'> DELETE'}</button>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', padding: 24, paddingTop: 40, zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{'> POST TO BULLETIN'}</div>
          <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 20 }}>{'> '}{selectedDate}</div>

          <div className="label">{'> PLAN'}</div>
          <input placeholder="concert at MSG, extra ticket..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus style={{ marginBottom: 16 }} />

          <div className="label">{'> TIME'}</div>
          <input placeholder="7pm, 19:00..." value={time} onChange={(e) => setTime(e.target.value)} style={{ marginBottom: 16 }} />

          <div className="label">{'> DETAILS'}</div>
          <textarea placeholder="who, where, notes..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ marginBottom: 20, resize: 'none' }} />

          <button className="btn" onClick={post} style={{ marginBottom: 12 }}>{'> POST'}</button>
          <button onClick={() => setModal(false)} style={{ padding: 16, color: 'var(--dim)', fontSize: 14, width: '100%' }}>{'> CANCEL'}</button>
        </div>
      )}
    </>
  );
}
