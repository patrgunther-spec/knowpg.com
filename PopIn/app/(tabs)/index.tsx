import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, getDoc, Timestamp,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebase';

type Pop = {
  id: string;
  creatorId: string;
  creatorName: string;
  destination: string;
  note: string;
  lat: number;
  lng: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
};

export default function PopsTab() {
  const user = auth.currentUser!;
  const router = useRouter();

  const [pops, setPops]               = useState<Pop[]>([]);
  const [myPops, setMyPops]           = useState<Pop[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [destination, setDestination] = useState('');
  const [note, setNote]               = useState('');
  const [sending, setSending]         = useState(false);

  // Load friend pops
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const friendIds: string[] = userSnap.data()?.friendIds ?? [];

      // My own pops
      const myQ = query(
        collection(db, 'pops'),
        where('creatorId', '==', user.uid),
        where('isActive', '==', true),
      );
      const unsubMe = onSnapshot(myQ, (snap) => {
        setMyPops(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Pop))
            .filter((p) => (p.expiresAt as any).toDate() > new Date()),
        );
      });

      if (friendIds.length === 0) {
        setLoading(false);
        return () => unsubMe();
      }

      // Friends' pops
      const friendQ = query(
        collection(db, 'pops'),
        where('creatorId', 'in', friendIds.slice(0, 30)),
        where('isActive', '==', true),
      );
      unsub = onSnapshot(friendQ, (snap) => {
        setPops(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Pop))
            .filter((p) => (p.expiresAt as any).toDate() > new Date()),
        );
        setLoading(false);
      });

      return () => { unsubMe(); unsub(); };
    })();
    return () => unsub();
  }, []);

  async function sendPop() {
    if (!destination.trim()) return Alert.alert('Where you headed?');
    setSending(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission needed!');

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const now = new Date();

      await addDoc(collection(db, 'pops'), {
        creatorId:   user.uid,
        creatorName: user.displayName ?? 'Someone',
        destination: destination.trim(),
        note:        note.trim(),
        lat:         loc.coords.latitude,
        lng:         loc.coords.longitude,
        isActive:    true,
        createdAt:   Timestamp.fromDate(now),
        expiresAt:   Timestamp.fromDate(new Date(now.getTime() + 4 * 60 * 60 * 1000)),
      });

      setDestination('');
      setNote('');
      setShowCreate(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSending(false);
  }

  async function endPop(popId: string) {
    await updateDoc(doc(db, 'pops', popId), { isActive: false });
  }

  const allPops = [...myPops, ...pops];

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Pop In</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={s.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Big button */}
      <TouchableOpacity style={s.bigBtn} onPress={() => setShowCreate(true)}>
        <Text style={s.bigBtnText}>📡  Pop In</Text>
        <Text style={s.bigBtnSub}>Tell your friends where you're headed</Text>
      </TouchableOpacity>

      {/* Feed */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#007AFF" />
      ) : allPops.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No pops yet</Text>
          <Text style={s.emptySub}>Hit the button above, or add some friends first!</Text>
        </View>
      ) : (
        <FlatList
          data={allPops}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: pop }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/pop/${pop.id}`)}
            >
              <View style={s.cardTop}>
                <Text style={s.cardName}>
                  {pop.creatorId === user.uid ? 'You' : pop.creatorName}
                </Text>
                <Text style={s.cardTime}>
                  {timeAgo((pop.createdAt as any).toDate())}
                </Text>
              </View>
              <Text style={s.cardDest}>📍 {pop.destination}</Text>
              {!!pop.note && <Text style={s.cardNote}>{pop.note}</Text>}
              {pop.creatorId === user.uid && (
                <TouchableOpacity style={s.endBtn} onPress={() => endPop(pop.id)}>
                  <Text style={s.endBtnText}>End Pop</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Pop sheet */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Where you headed?</Text>

          <Text style={s.label}>Destination *</Text>
          <TextInput
            style={s.input}
            placeholder="Central Park, Joe's Pizza…"
            value={destination}
            onChangeText={setDestination}
            autoFocus
          />

          <Text style={s.label}>Any details? (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="Getting there around 8…"
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity style={s.sendBtn} onPress={sendPop} disabled={sending}>
            <Text style={s.sendBtnText}>{sending ? 'Sending…' : '📡  Send Pop'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const s = StyleSheet.create({
  page:         { flex: 1, backgroundColor: '#f5f5f5' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle:  { fontSize: 22, fontWeight: 'bold' },
  signOut:      { color: '#007AFF', fontSize: 15 },
  bigBtn:       { margin: 16, backgroundColor: '#007AFF', borderRadius: 18, padding: 22, alignItems: 'center' },
  bigBtnText:   { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  bigBtnSub:    { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle:   { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySub:     { fontSize: 15, color: '#888', textAlign: 'center' },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardName:     { fontSize: 16, fontWeight: '600' },
  cardTime:     { fontSize: 13, color: '#999' },
  cardDest:     { fontSize: 17, fontWeight: '500', marginBottom: 4 },
  cardNote:     { fontSize: 14, color: '#666' },
  endBtn:       { marginTop: 10, borderWidth: 1, borderColor: '#ff3b30', borderRadius: 8, padding: 8, alignItems: 'center' },
  endBtnText:   { color: '#ff3b30', fontSize: 14 },
  sheet:        { flex: 1, padding: 28, paddingTop: 40 },
  sheetTitle:   { fontSize: 26, fontWeight: 'bold', marginBottom: 28 },
  label:        { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, backgroundColor: '#f9f9f9' },
  sendBtn:      { backgroundColor: '#007AFF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  sendBtnText:  { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelBtn:    { padding: 16, alignItems: 'center' },
  cancelBtnText:{ color: '#888', fontSize: 16 },
});
