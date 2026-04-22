'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED, Profile } from './supabase';

type Ctx = {
  me: Profile | null;
  friends: Profile[];
  incoming: Profile[];
  outgoing: Profile[];
  session: Session | null;
  loading: boolean;
  toast: string;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  updateMe: (patch: Partial<Profile>) => Promise<string | null>;
  signOut: () => Promise<void>;
  sendRequest: (code: string) => Promise<{ error?: string; ok?: string }>;
  acceptRequest: (otherId: string) => Promise<string | null>;
  declineRequest: (otherId: string) => Promise<string | null>;
  removeFriend: (otherId: string) => Promise<void>;
  cancelRequest: (otherId: string) => Promise<void>;
  configured: boolean;
};

const AppContext = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(AppContext);

function makeCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

const PENDING_KEY = 'popin.pendingFriendCode';

function readPendingFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('add');
  if (!code) return null;
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (c.length !== 6) return null;
  return c;
}

function stashPending(code: string) {
  try { sessionStorage.setItem(PENDING_KEY, code); } catch {}
}

function consumePending(): string | null {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return v;
  } catch { return null; }
}

function clearUrlParam() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('add');
  window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [incoming, setIncoming] = useState<Profile[]>([]);
  const [outgoing, setOutgoing] = useState<Profile[]>([]);
  const [toast, setToast] = useState('');
  const initDone = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  useEffect(() => {
    const code = readPendingFromUrl();
    if (code) { stashPending(code); clearUrlParam(); }
  }, []);

  // Initial auth + profile load — loading stays true until BOTH resolve (no Welcome flash)
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const { data: prof } = await supabase
          .from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
        if (prof) {
          setMe(prof as Profile);
        } else {
          await supabase.auth.signOut();
          setSession(null);
        }
      }
      initDone.current = true;
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Fetch profile on subsequent sign-in/out (not initial load)
  useEffect(() => {
    if (!initDone.current) return;
    if (!session?.user) { setMe(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (!cancelled && data) setMe(data as Profile);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Realtime own-profile updates
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel('me-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${me.id}` },
        (p) => setMe(p.new as Profile))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id]);

  // Full reload from DB (background sync, not for UI-blocking)
  const reload = useCallback(async () => {
    if (!me) return;
    const { data: edges, error } = await supabase
      .from('friends')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${me.id},friend_id.eq.${me.id}`);
    if (error) { console.error('[reload]', error); return; }
    const rows = (edges ?? []) as { user_id: string; friend_id: string; status: string | null }[];

    const friendIds = new Set<string>();
    const incomingIds = new Set<string>();
    const outgoingIds = new Set<string>();

    for (const r of rows) {
      const st = r.status ?? 'accepted';
      const other = r.user_id === me.id ? r.friend_id : r.user_id;
      if (st === 'accepted') friendIds.add(other);
      else if (st === 'pending') {
        if (r.friend_id === me.id) incomingIds.add(r.user_id);
        else outgoingIds.add(r.friend_id);
      }
    }

    const allIds = [...friendIds, ...incomingIds, ...outgoingIds];
    if (allIds.length === 0) { setFriends([]); setIncoming([]); setOutgoing([]); return; }
    const { data: profs } = await supabase.from('profiles').select('*').in('id', allIds);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p as Profile]));
    setFriends([...friendIds].map((id) => byId.get(id)).filter(Boolean) as Profile[]);
    setIncoming([...incomingIds].map((id) => byId.get(id)).filter(Boolean) as Profile[]);
    setOutgoing([...outgoingIds].map((id) => byId.get(id)).filter(Boolean) as Profile[]);
  }, [me?.id]);

  // Realtime friend-edge + profile subscriptions + polling
  useEffect(() => {
    if (!me) { setFriends([]); setIncoming([]); setOutgoing([]); return; }
    reload();
    const edgeCh = supabase.channel('edges-' + me.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${me.id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `friend_id=eq.${me.id}` }, () => reload())
      .subscribe();
    const profCh = supabase.channel('profs-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p) => {
        const u = p.new as Profile;
        setFriends((prev) => prev.map((f) => (f.id === u.id ? u : f)));
        setIncoming((prev) => prev.map((f) => (f.id === u.id ? u : f)));
        setOutgoing((prev) => prev.map((f) => (f.id === u.id ? u : f)));
      })
      .subscribe();
    const poll = setInterval(reload, 15000);
    return () => { supabase.removeChannel(edgeCh); supabase.removeChannel(profCh); clearInterval(poll); };
  }, [me?.id, reload]);

  // Geolocation
  useEffect(() => {
    if (!me || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const push = async (lat: number, lng: number) => {
      await supabase.from('profiles').update({ lat, lng }).eq('id', me.id);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => push(pos.coords.latitude, pos.coords.longitude), () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
    const wid = navigator.geolocation.watchPosition(
      (pos) => push(pos.coords.latitude, pos.coords.longitude), () => {},
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, [me?.id]);

  // --- Friend operations with optimistic updates ---

  async function sendRequest(code: string): Promise<{ error?: string; ok?: string }> {
    if (!me) return { error: 'not logged in' };
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return { error: 'code must be 6 chars' };
    if (c === me.friend_code) return { error: "that's your own code" };

    const { data: other, error: fErr } = await supabase
      .from('profiles').select('*').eq('friend_code', c).maybeSingle();
    if (fErr) return { error: fErr.message };
    if (!other) return { error: 'no user with that code' };
    const o = other as Profile;

    const { data: existing, error: exErr } = await supabase
      .from('friends').select('user_id, friend_id, status')
      .or(`and(user_id.eq.${me.id},friend_id.eq.${o.id}),and(user_id.eq.${o.id},friend_id.eq.${me.id})`);
    if (exErr) return { error: exErr.message };
    const rows = (existing ?? []) as { user_id: string; friend_id: string; status: string | null }[];

    // They already sent us a request → auto-accept
    const rev = rows.find((r) => r.user_id === o.id && r.friend_id === me.id && (r.status ?? 'accepted') === 'pending');
    if (rev) {
      setIncoming((prev) => prev.filter((f) => f.id !== o.id));
      setFriends((prev) => [...prev, o]);
      const { error: uErr } = await supabase
        .from('friends').update({ status: 'accepted' }).eq('user_id', o.id).eq('friend_id', me.id);
      if (uErr) {
        setFriends((prev) => prev.filter((f) => f.id !== o.id));
        setIncoming((prev) => [...prev, o]);
        return { error: uErr.message };
      }
      return { ok: `${o.name} added!` };
    }

    if (rows.some((r) => (r.status ?? 'accepted') === 'accepted')) return { ok: `already friends with ${o.name}` };
    if (rows.find((r) => r.user_id === me.id && r.friend_id === o.id && (r.status ?? 'accepted') === 'pending')) return { ok: `already sent to ${o.name}` };

    setOutgoing((prev) => [...prev, o]);
    const { error: iErr } = await supabase.from('friends').insert({ user_id: me.id, friend_id: o.id });
    if (iErr) {
      setOutgoing((prev) => prev.filter((f) => f.id !== o.id));
      return { error: iErr.message };
    }
    return { ok: `request sent to ${o.name}` };
  }

  async function acceptRequest(otherId: string): Promise<string | null> {
    if (!me) return 'not logged in';
    const friend = incoming.find((f) => f.id === otherId);
    if (friend) {
      setIncoming((prev) => prev.filter((f) => f.id !== otherId));
      setFriends((prev) => [...prev, friend]);
    }
    const { data, error } = await supabase
      .from('friends').update({ status: 'accepted' })
      .eq('user_id', otherId).eq('friend_id', me.id).select();
    if (error || !data?.length) {
      if (friend) {
        setFriends((prev) => prev.filter((f) => f.id !== otherId));
        setIncoming((prev) => [...prev, friend]);
      }
      const msg = error?.message ?? 'request not found';
      showToast(msg);
      return msg;
    }
    showToast('friend added!');
    return null;
  }

  async function declineRequest(otherId: string): Promise<string | null> {
    if (!me) return 'not logged in';
    const friend = incoming.find((f) => f.id === otherId);
    setIncoming((prev) => prev.filter((f) => f.id !== otherId));
    const { error } = await supabase.from('friends').delete()
      .eq('user_id', otherId).eq('friend_id', me.id);
    if (error) {
      if (friend) setIncoming((prev) => [...prev, friend]);
      showToast(error.message);
      return error.message;
    }
    return null;
  }

  async function removeFriend(otherId: string) {
    if (!me) return;
    const friend = friends.find((f) => f.id === otherId);
    setFriends((prev) => prev.filter((f) => f.id !== otherId));
    const { error } = await supabase.from('friends').delete()
      .or(`and(user_id.eq.${me.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${me.id})`);
    if (error) {
      if (friend) setFriends((prev) => [...prev, friend]);
      showToast(error.message);
    }
  }

  async function cancelRequest(otherId: string) {
    if (!me) return;
    const friend = outgoing.find((f) => f.id === otherId);
    setOutgoing((prev) => prev.filter((f) => f.id !== otherId));
    const { error } = await supabase.from('friends').delete()
      .eq('user_id', me.id).eq('friend_id', otherId);
    if (error) {
      if (friend) setOutgoing((prev) => [...prev, friend]);
      showToast(error.message);
    }
  }

  // Auto-consume pending friend code after login
  useEffect(() => {
    if (!me) return;
    const code = consumePending();
    if (!code) return;
    (async () => {
      const res = await sendRequest(code);
      if (res.error) showToast(res.error);
      else if (res.ok) showToast(res.ok);
    })();
  }, [me?.id]);

  async function signUp(email: string, password: string, name: string): Promise<string | null> {
    const e = email.trim().toLowerCase();
    const n = name.trim();
    if (!e || !e.includes('@')) return 'enter a valid email';
    if (password.length < 6) return 'password needs 6+ chars';
    if (!n) return 'enter a name';

    const { data, error } = await supabase.auth.signUp({ email: e, password });
    if (error) return error.message;
    if (!data.user) return 'signup failed';

    if (!data.session) {
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: e, password });
      if (sErr) return 'email confirmation is on — turn it off in Supabase → Auth → Providers → Email';
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const fc = makeCode();
      const { data: prof, error: pErr } = await supabase.from('profiles')
        .insert({ id: data.user.id, name: n, friend_code: fc }).select().single();
      if (!pErr && prof) { setMe(prof as Profile); return null; }
      if (pErr && pErr.code === '23505' && pErr.message?.includes('friend_code')) continue;
      return pErr?.message ?? 'profile creation failed';
    }
    return 'could not generate unique friend code';
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) return 'enter a valid email';
    if (!password) return 'enter a password';
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) return error.message;
    return null;
  }

  async function updateMe(patch: Partial<Profile>): Promise<string | null> {
    if (!me) return 'not logged in';
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', me.id).select().single();
    if (error) return error.message;
    if (!data) return 'update failed';
    setMe(data as Profile);
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMe(null);
    setFriends([]); setIncoming([]); setOutgoing([]);
  }

  return (
    <AppContext.Provider value={{
      me, friends, incoming, outgoing, session, loading, toast,
      signUp, signIn, updateMe, signOut,
      sendRequest, acceptRequest, declineRequest, removeFriend, cancelRequest,
      configured: SUPABASE_CONFIGURED,
    }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 96, zIndex: 9999, background: '#000',
          border: '1px solid var(--green)', color: 'var(--green)',
          padding: '10px 18px', fontSize: 13, fontWeight: 'bold',
          letterSpacing: 1, maxWidth: '90vw', textAlign: 'center',
        }}>
          {'> '}{toast.toUpperCase()}
        </div>
      )}
    </AppContext.Provider>
  );
}
