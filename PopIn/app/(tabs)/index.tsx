import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  Modal, Alert, StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useApp } from '../_layout';

export default function PopsTab() {
  const { userName, pops, addPop, endPop } = useApp();
  const router = useRouter();

  const [showCreate, setShowCreate]   = useState(false);
  const [destination, setDestination] = useState('');
  const [note, setNote]               = useState('');
  const [sending, setSending]         = useState(false);

  async function sendPop() {
    if (!destination.trim()) return Alert.alert('Where you headed?');
    setSending(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Pop In needs your location to work. Enable it in Settings.');
        setSending(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      addPop({
        destination: destination.trim(),
        note: note.trim(),
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setDestination('');
      setNote('');
      setShowCreate(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSending(false);
  }

  function timeAgo(ts: number) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.hi}>Hey, {userName} 👋</Text>
      </View>

      {/* Big button */}
      <TouchableOpacity style={s.bigBtn} onPress={() => setShowCreate(true)}>
        <Text style={s.bigBtnText}>📡  Pop In</Text>
        <Text style={s.bigBtnSub}>Tell your friends where you're headed</Text>
      </TouchableOpacity>

      {/* Feed */}
      {pops.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No pops yet</Text>
          <Text style={s.emptySub}>Tap the button above to send your first pop!</Text>
        </View>
      ) : (
        <FlatList
          data={pops}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: pop }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/pop/${pop.id}`)}
            >
              <View style={s.cardTop}>
                <Text style={s.cardName}>{userName}</Text>
                <Text style={s.cardTime}>{timeAgo(pop.createdAt)}</Text>
              </View>
              <Text style={s.cardDest}>📍 {pop.destination}</Text>
              {!!pop.note && <Text style={s.cardNote}>{pop.note}</Text>}
              <TouchableOpacity style={s.endBtn} onPress={() => endPop(pop.id)}>
                <Text style={s.endBtnText}>End Pop</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create sheet */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Where you headed?</Text>

          <TextInput
            style={s.input}
            placeholder="Central Park, Joe's Pizza…"
            value={destination}
            onChangeText={setDestination}
            autoFocus
          />

          <TextInput
            style={s.input}
            placeholder="Any details? (optional)"
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity style={s.sendBtn} onPress={sendPop} disabled={sending}>
            <Text style={s.sendBtnText}>{sending ? 'Getting location…' : '📡  Send Pop'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#f5f5f5' },
  header:      { padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  hi:          { fontSize: 22, fontWeight: 'bold' },
  bigBtn:      { margin: 16, backgroundColor: '#007AFF', borderRadius: 18, padding: 24, alignItems: 'center' },
  bigBtnText:  { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  bigBtnSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 },
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle:  { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySub:    { fontSize: 15, color: '#888', textAlign: 'center' },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardName:    { fontSize: 16, fontWeight: '600' },
  cardTime:    { fontSize: 13, color: '#999' },
  cardDest:    { fontSize: 18, fontWeight: '500', marginBottom: 4 },
  cardNote:    { fontSize: 14, color: '#666' },
  endBtn:      { marginTop: 12, borderWidth: 1, borderColor: '#ff3b30', borderRadius: 8, padding: 8, alignItems: 'center' },
  endBtnText:  { color: '#ff3b30', fontSize: 14 },
  sheet:       { flex: 1, padding: 28, paddingTop: 48 },
  sheetTitle:  { fontSize: 28, fontWeight: 'bold', marginBottom: 32 },
  input:       { borderWidth: 1, borderColor: '#ddd', borderRadius: 14, padding: 16, fontSize: 17, marginBottom: 16, backgroundColor: '#f9f9f9' },
  sendBtn:     { backgroundColor: '#007AFF', borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 12 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cancelBtn:   { padding: 18, alignItems: 'center' },
  cancelText:  { color: '#888', fontSize: 16 },
});
