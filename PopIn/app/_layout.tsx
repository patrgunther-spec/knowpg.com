import { useEffect, useState, createContext, useContext } from 'react';
import { Slot } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const BG = '#0a0a0a';

type UserLocation = { lat: number; lng: number } | null;
type Msg = { sender: string; text: string; time: number };

type Profile = {
  avatar: string;
  website: string;
  homeLocation: string;
};

export type Plan = {
  id: string;
  creator: string;
  title: string;
  date: string;
  time: string;
  note: string;
  createdAt: number;
};

type Ctx = {
  userName: string;
  setUserName: (n: string) => void;
  friendCode: string;
  userStatus: string;
  setUserStatus: (s: string) => void;
  userLocation: UserLocation;
  messages: Record<string, Msg[]>;
  addMessage: (convId: string, text: string) => void;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;
  plans: Plan[];
  addPlan: (p: Omit<Plan, 'id' | 'creator' | 'createdAt'>) => void;
  deletePlan: (id: string) => void;
};

const AppContext = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(AppContext);

export default function RootLayout() {
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [profile, setProfile] = useState<Profile>({ avatar: '', website: '', homeLocation: '' });
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('userName'),
      AsyncStorage.getItem('friendCode'),
      AsyncStorage.getItem('profile'),
      AsyncStorage.getItem('plans'),
    ]).then(([n, fc, p, pl]) => {
      if (n) {
        setName(n);
        setCode(fc || makeCode());
        if (!fc) AsyncStorage.setItem('friendCode', code);
      }
      if (p) {
        try { setProfile(JSON.parse(p)); } catch {}
      }
      if (pl) {
        try { setPlans(JSON.parse(pl)); } catch {}
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!name) return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (l) => setUserLocation({ lat: l.coords.latitude, lng: l.coords.longitude }),
      );
    })();
    return () => { sub?.remove(); };
  }, [name]);

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    AsyncStorage.setItem('userName', n);
    const c = makeCode();
    AsyncStorage.setItem('friendCode', c);
    setName(n);
    setCode(c);
  }

  function setUserName(n: string) {
    setName(n);
    AsyncStorage.setItem('userName', n);
  }

  function updateProfile(p: Partial<Profile>) {
    setProfile((prev) => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem('profile', JSON.stringify(next));
      return next;
    });
  }

  function addMessage(convId: string, text: string) {
    setMessages((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), { sender: name!, text, time: Date.now() }],
    }));
  }

  function addPlan(p: Omit<Plan, 'id' | 'creator' | 'createdAt'>) {
    setPlans((prev) => {
      const next = [
        ...prev,
        { ...p, id: String(Date.now()), creator: name!, createdAt: Date.now() },
      ];
      AsyncStorage.setItem('plans', JSON.stringify(next));
      return next;
    });
  }

  function deletePlan(id: string) {
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem('plans', JSON.stringify(next));
      return next;
    });
  }

  if (loading) {
    return (
      <View style={s.center}>
        <Text style={s.loadingText}>{'> INITIALIZING...'}</Text>
      </View>
    );
  }

  if (!name) {
    return (
      <View style={s.welcome}>
        <Text style={s.logo}>{'> POP IN'}</Text>
        <Text style={s.version}>v1.0.0</Text>
        <Text style={s.prompt}>{'> ENTER HANDLE:'}</Text>
        <TextInput
          style={s.input}
          placeholder="your name..."
          placeholderTextColor="#006620"
          value={nameInput}
          onChangeText={setInput}
          autoFocus
          autoCapitalize="none"
        />
        <TouchableOpacity style={s.btn} onPress={saveName}>
          <Text style={s.btnText}>{'> CONNECT'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AppContext.Provider
      value={{ userName: name, setUserName, friendCode: code, userStatus, setUserStatus, userLocation, messages, addMessage, profile, updateProfile, plans, addPlan, deletePlan }}
    >
      <Slot />
    </AppContext.Provider>
  );
}

function makeCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONT, color: GREEN, fontSize: 18 },
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
});
