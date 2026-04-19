import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  doc, getDoc, collection, query,
  orderBy, onSnapshot, addDoc, Timestamp,
} from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { auth, db } from '../../services/firebase';

type Pop = {
  creatorName: string;
  destination: string;
  note: string;
  lat: number;
  lng: number;
};
type Msg = { id: string; senderId: string; senderName: string; text: string; createdAt: any };

export default function PopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = auth.currentUser!;
  const listRef = useRef<FlatList>(null);

  const [pop, setPop]       = useState<Pop | null>(null);
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [text, setText]     = useState('');

  useEffect(() => {
    // Load pop info
    getDoc(doc(db, 'pops', id)).then((s) => {
      if (s.exists()) setPop(s.data() as Pop);
    });

    // Listen to chat
    const unsub = onSnapshot(
      query(collection(db, 'pops', id, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => {
        setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Msg)));
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
    );
    return unsub;
  }, [id]);

  async function send() {
    if (!text.trim()) return;
    const t = text.trim();
    setText('');
    await addDoc(collection(db, 'pops', id, 'messages'), {
      senderId:   user.uid,
      senderName: user.displayName ?? 'Someone',
      text:       t,
      createdAt:  Timestamp.now(),
    });
  }

  if (!pop) return <View style={s.loading}><Text>Loading…</Text></View>;

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Map */}
      <MapView
        style={s.map}
        initialRegion={{
          latitude: pop.lat,
          longitude: pop.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={{ latitude: pop.lat, longitude: pop.lng }} title={pop.creatorName} />
      </MapView>

      {/* Pop info */}
      <View style={s.info}>
        <Text style={s.dest}>📍 {pop.destination}</Text>
        {!!pop.note && <Text style={s.note}>{pop.note}</Text>}
      </View>

      {/* Chat */}
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.chatList}
        renderItem={({ item: m }) => {
          const mine = m.senderId === user.uid;
          return (
            <View style={[s.bubble, mine ? s.mine : s.theirs]}>
              {!mine && <Text style={s.sender}>{m.senderName}</Text>}
              <Text style={[s.msgText, mine && s.mineText]}>{m.text}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={s.noMsgs}>No messages yet. Say something! 👋</Text>
        }
      />

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Say something…"
          value={text}
          onChangeText={setText}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <TouchableOpacity style={s.sendBtn} onPress={send}>
          <Text style={s.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page:       { flex: 1, backgroundColor: '#fff' },
  loading:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map:        { height: 220 },
  info:       { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  dest:       { fontSize: 18, fontWeight: '600' },
  note:       { fontSize: 14, color: '#666', marginTop: 4 },
  chatList:   { padding: 12, paddingBottom: 4 },
  noMsgs:     { textAlign: 'center', color: '#aaa', marginTop: 20 },
  bubble:     { maxWidth: '78%', borderRadius: 16, padding: 10, marginBottom: 8 },
  theirs:     { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  mine:       { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  sender:     { fontSize: 11, color: '#888', marginBottom: 3 },
  msgText:    { fontSize: 15 },
  mineText:   { color: '#fff' },
  inputRow:   { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  input:      { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, backgroundColor: '#f9f9f9' },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnText:{ color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
