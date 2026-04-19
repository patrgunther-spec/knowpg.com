import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useApp } from '../_layout';

export default function PopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userName, pops, messages, addMessage } = useApp();
  const [text, setText] = useState('');

  const pop = pops.find((p) => p.id === id);
  if (!pop) {
    return (
      <View style={s.center}>
        <Text>Pop not found</Text>
      </View>
    );
  }

  const msgs = messages[id] ?? [];

  function send() {
    if (!text.trim()) return;
    addMessage(id, text.trim());
    setText('');
  }

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
        <Marker
          coordinate={{ latitude: pop.lat, longitude: pop.lng }}
          title={userName}
          description={pop.destination}
        />
      </MapView>

      {/* Pop info */}
      <View style={s.info}>
        <Text style={s.dest}>📍 {pop.destination}</Text>
        {!!pop.note && <Text style={s.note}>{pop.note}</Text>}
      </View>

      {/* Chat */}
      <FlatList
        data={msgs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.chatList}
        renderItem={({ item: m }) => (
          <View style={s.bubble}>
            <Text style={s.msgText}>{m.text}</Text>
            <Text style={s.msgTime}>
              {new Date(m.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        )}
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
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map:        { height: 240 },
  info:       { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dest:       { fontSize: 20, fontWeight: '600' },
  note:       { fontSize: 14, color: '#666', marginTop: 4 },
  chatList:   { padding: 12, paddingBottom: 4 },
  noMsgs:     { textAlign: 'center', color: '#aaa', marginTop: 30, fontSize: 15 },
  bubble:     { backgroundColor: '#007AFF', alignSelf: 'flex-end', maxWidth: '78%', borderRadius: 18, padding: 12, marginBottom: 8 },
  msgText:    { color: '#fff', fontSize: 16 },
  msgTime:    { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, textAlign: 'right' },
  inputRow:   { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  input:      { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, backgroundColor: '#f9f9f9' },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnText:{ color: '#fff', fontSize: 22, fontWeight: 'bold' },
});
