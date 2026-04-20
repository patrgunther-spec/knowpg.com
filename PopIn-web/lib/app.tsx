'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED, Profile } from './supabase';

type Ctx = {
  me: Profile | null;
  friends: Profile[];
  session: Session | null;
  loading: boolean;
  signUp: (name: string) => Promise<string | null>;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);

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

  async function loadFriends() {
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
  }

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
  }, [me?.id]);

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

  async function signUp(name: string): Promise<string | null> {
    const n = name.trim();
    if (!n) return 'name required';
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return error?.message ?? 'auth failed';
    const fc = makeCode();
    const { data: prof, error: pErr } = await supabase.from('profiles')
      .insert({ id: data.user.id, name: n, friend_code: fc })
      .select().single();
    if (pErr || !prof) return pErr?.message ?? 'profile failed';
    setMe(prof as Profile);
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
    <AppContext.Provider value={{ me, friends, session, loading, signUp, updateMe, signOut, configured: SUPABASE_CONFIGURED }}>
      {children}
    </AppContext.Provider>
  );
}
