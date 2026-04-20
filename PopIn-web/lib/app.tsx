'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED, Profile } from './supabase';

type Ctx = {
  me: Profile | null;
  friends: Profile[];
  session: Session | null;
  loading: boolean;
  toast: string;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  updateMe: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  useEffect(() => {
    const code = readPendingFromUrl();
    if (code) {
      stashPending(code);
      clearUrlParam();
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setMe(null); return; }
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (data) setMe(data as Profile);
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel('me-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${me.id}` },
        (p) => setMe(p.new as Profile))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id]);

  const loadFriends = useCallback(async () => {
    if (!me) return;
    const { data: edges } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${me.id},friend_id.eq.${me.id}`);
    const ids = Array.from(new Set(
      (edges ?? []).map((e: any) => (e.user_id === me.id ? e.friend_id : e.user_id))
    ));
    if (ids.length === 0) { setFriends([]); return; }
    const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
    setFriends((profs ?? []) as Profile[]);
  }, [me?.id]);

  useEffect(() => {
    if (!me) return;
    loadFriends();
    const edgeCh = supabase.channel('friend-edges-' + me.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${me.id}` },
        () => loadFriends())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `friend_id=eq.${me.id}` },
        () => loadFriends())
      .subscribe();
    const profCh = supabase.channel('all-profiles-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (p) => {
          const u = p.new as Profile;
          setFriends((prev) => prev.map((f) => (f.id === u.id ? u : f)));
        })
      .subscribe();
    return () => { supabase.removeChannel(edgeCh); supabase.removeChannel(profCh); };
  }, [me?.id, loadFriends]);

  useEffect(() => {
    if (!me || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const push = async (lat: number, lng: number) => {
      await supabase.from('profiles').update({ lat, lng }).eq('id', me.id);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => push(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) => push(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [me?.id]);

  useEffect(() => {
    if (!me) return;
    const code = consumePending();
    if (!code) return;
    (async () => {
      if (code === me.friend_code) return;
      const { data: other } = await supabase
        .from('profiles').select('*').eq('friend_code', code).maybeSingle();
      if (!other) { showToast('friend code not found'); return; }
      const otherId = (other as Profile).id;
      const { data: existing } = await supabase
        .from('friends').select('user_id')
        .or(`and(user_id.eq.${me.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${me.id})`)
        .limit(1);
      if (existing && existing.length > 0) {
        showToast(`already friends with ${(other as Profile).name}`);
        return;
      }
      const { error } = await supabase.from('friends').insert({ user_id: me.id, friend_id: otherId });
      if (error) { showToast(error.message); return; }
      showToast(`added ${(other as Profile).name}`);
      loadFriends();
    })();
  }, [me?.id, loadFriends, showToast]);

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
      if (sErr) return 'account created — now log in';
    }

    const fc = makeCode();
    const { data: prof, error: pErr } = await supabase.from('profiles')
      .insert({ id: data.user.id, name: n, friend_code: fc })
      .select().single();
    if (pErr || !prof) return pErr?.message ?? 'profile creation failed';
    setMe(prof as Profile);
    return null;
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) return 'enter a valid email';
    if (!password) return 'enter a password';
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) return error.message;
    return null;
  }

  async function updateMe(patch: Partial<Profile>) {
    if (!me) return;
    const { data } = await supabase.from('profiles').update(patch).eq('id', me.id).select().single();
    if (data) setMe(data as Profile);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMe(null);
    setFriends([]);
  }

  return (
    <AppContext.Provider value={{ me, friends, session, loading, toast, signUp, signIn, updateMe, signOut, configured: SUPABASE_CONFIGURED }}>
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
