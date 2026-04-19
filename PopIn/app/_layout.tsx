import { useEffect, useState, createContext, useContext } from 'react';
import { Slot } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const RED = '#ff3333';
const BG = '#0a0a0a';

export type Profile = {
  id: string;
  name: string;
  friend_code: string;
  avatar: string;
  website: string;
  home_location: string;
  status: string;
  lat: number | null;
  lng: number | null;
};

export type Plan = {
  id: string;
  creator_id: string;
  title: string;
  date: string;
  time: string;
  note: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
};

type Ctx = {
  me: Profile;
  friends: Profile[];
  updateMe: (patch: Partial<Profile>) => Promise<void>;
  refreshFriends: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(AppContext);

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [nameInput, setInput] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [err, setErr] = useState('');

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
    const { data: edges } = await supabase.from('friends').select('friend_id').eq('user_id', me.id);
    const ids = (edges ?? []).map((e: any) => e.friend_id);
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
      .subscribe();
    const profCh = supabase.channel('all-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (p) => {
          const u = p.new as Profile;
          setFriends((prev) => prev.map((f) => (f.id === u.id ? u : f)));
        })
      .subscribe();
    return () => { supabase.removeChannel(edgeCh); supabase.removeChannel(profCh); };
  }, [me?.id]);

  useEffect(() => {
    if (!me) return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      await supabase.from('profiles').update({ lat: loc.coords.latitude, lng: loc.coords.longitude }).eq('id', me.id);
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 30000 },
        async (l) => {
          await supabase.from('profiles').update({ lat: l.coords.latitude, lng: l.coords.longitude }).eq('id', me.id);
        },
      );
    })();
    return () => { sub?.remove(); };
  }, [me?.id]);

  async function signUp() {
    const n = nameInput.trim();
    if (!n) return;
    setErr('');
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.user) { setErr(error?.message ?? 'auth failed'); return; }
      const fc = makeCode();
      const { data: prof, error: pErr } = await supabase.from('profiles')
        .insert({ id: data.user.id, name: n, friend_code: fc })
        .select().single();
      if (pErr || !prof) { setErr(pErr?.message ?? 'profile failed'); return; }
      setMe(prof as Profile);
    } finally {
      setSigningIn(false);
    }
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

  if (!SUPABASE_CONFIGURED) {
    return (
      <View style={s.center}>
        <Text style={s.errHeader}>{'> BACKEND NOT CONFIGURED'}</Text>
        <Text style={s.errBody}>
          {'> create .env file in PopIn folder'}{'\n'}
          {'> add EXPO_PUBLIC_SUPABASE_URL'}{'\n'}
          {'> add EXPO_PUBLIC_SUPABASE_ANON_KEY'}{'\n'}
          {'> see SETUP.md'}
        </Text>
      </View>
    );
  }

  if (loading) return <View style={s.center}><Text style={s.loadingText}>{'> INITIALIZING...'}</Text></View>;

  if (!session || !me) {
    return (
      <View style={s.welcome}>
        <Text style={s.logo}>{'> POP IN'}</Text>
        <Text style={s.version}>v1.0.0 beta</Text>
        <Text style={s.prompt}>{'> ENTER HANDLE:'}</Text>
        <TextInput
          style={s.input}
          placeholder="your name..."
          placeholderTextColor="#006620"
          value={nameInput}
          onChangeText={setInput}
          autoCapitalize="none"
          editable={!signingIn}
        />
        <TouchableOpacity style={s.btn} onPress={signUp} disabled={signingIn}>
          <Text style={s.btnText}>{signingIn ? '> CONNECTING...' : '> CONNECT'}</Text>
        </TouchableOpacity>
        {!!err && <Text style={s.errText}>{'> '}{err}</Text>}
      </View>
    );
  }

  return (
    <AppContext.Provider value={{ me, friends, updateMe, refreshFriends: loadFriends, signOut }}>
      <Slot />
    </AppContext.Provider>
  );
}

function makeCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { fontFamily: FONT, color: GREEN, fontSize: 18 },
  errHeader: { fontFamily: FONT, color: RED, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  errBody: { fontFamily: FONT, color: GREEN, fontSize: 13, lineHeight: 22 },
  welcome: { flex: 1, backgroundColor: BG, justifyContent: 'center', padding: 32 },
  logo: { fontFamily: FONT, color: GREEN, fontSize: 42, fontWeight: 'bold', marginBottom: 4 },
  version: { fontFamily: FONT, color: '#006620', fontSize: 14, marginBottom: 48 },
  prompt: { fontFamily: FONT, color: GREEN, fontSize: 16, marginBottom: 12 },
  input: {
    fontFamily: FONT, color: GREEN, fontSize: 18,
    borderWidth: 1, borderColor: GREEN, backgroundColor: '#000',
    padding: 14, marginBottom: 20,
  },
  btn: { borderWidth: 1, borderColor: GREEN, padding: 16, alignItems: 'center' },
  btnText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  errText: { fontFamily: FONT, color: RED, fontSize: 13, marginTop: 16 },
});
