import { useEffect, useState, createContext, useContext } from 'react';
import { Slot } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── App Data (lives in memory, name saved to phone) ──

type Pop = {
  id: string;
  destination: string;
  note: string;
  lat: number;
  lng: number;
  createdAt: number;
};
type Msg = { name: string; text: string; time: number };

type Ctx = {
  userName: string;
  friendCode: string;
  pops: Pop[];
  addPop: (p: Omit<Pop, 'id' | 'createdAt'>) => void;
  endPop: (id: string) => void;
  messages: Record<string, Msg[]>;
  addMessage: (popId: string, text: string) => void;
};

const AppContext = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(AppContext);

// ── Root Layout ──

export default function RootLayout() {
  const [name, setName]         = useState<string | null>(null);
  const [nameInput, setInput]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [pops, setPops]         = useState<Pop[]>([]);
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [code, setCode]         = useState('');

  // Load saved name on startup
  useEffect(() => {
    AsyncStorage.getItem('userName').then((n) => {
      if (n) {
        setName(n);
        setCode(makeCode());
      }
      setLoading(false);
    });
  }, []);

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    AsyncStorage.setItem('userName', n);
    setName(n);
    setCode(makeCode());
  }

  function addPop(p: Omit<Pop, 'id' | 'createdAt'>) {
    setPops((prev) => [
      { ...p, id: String(Date.now()), createdAt: Date.now() },
      ...prev,
    ]);
  }

  function endPop(id: string) {
    setPops((prev) => prev.filter((p) => p.id !== id));
  }

  function addMessage(popId: string, text: string) {
    setMessages((prev) => ({
      ...prev,
      [popId]: [...(prev[popId] ?? []), { name: name!, text, time: Date.now() }],
    }));
  }

  if (loading) {
    return (
      <View style={s.center}>
        <Text style={s.loading}>Loading...</Text>
      </View>
    );
  }

  // First time: ask for name
  if (!name) {
    return (
      <View style={s.welcome}>
        <Text style={s.emoji}>👋</Text>
        <Text style={s.title}>Pop In</Text>
        <Text style={s.sub}>Let your friends know{'\n'}where you're at.</Text>
        <TextInput
          style={s.input}
          placeholder="What's your name?"
          value={nameInput}
          onChangeText={setInput}
          autoFocus
        />
        <TouchableOpacity style={s.btn} onPress={saveName}>
          <Text style={s.btnText}>Let's Go</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AppContext.Provider
      value={{ userName: name, friendCode: code, pops, addPop, endPop, messages, addMessage }}
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
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { fontSize: 18, color: '#888' },
  welcome: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  emoji:   { fontSize: 72, textAlign: 'center', marginBottom: 8 },
  title:   { fontSize: 48, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  sub:     { fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 48, lineHeight: 26 },
  input:   { borderWidth: 1, borderColor: '#ddd', borderRadius: 14, padding: 16, fontSize: 18, marginBottom: 16, backgroundColor: '#f9f9f9', textAlign: 'center' },
  btn:     { backgroundColor: '#007AFF', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
