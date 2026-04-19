import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp, Message } from '../_layout';
import { supabase } from '../../lib/supabase';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const DIM = '#006620';
const DARK = '#003300';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, friends } = useApp();
  const router = useRouter();
  const friend = friends.find((f) => f.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  async function load() {
    if (!id) return;
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${me.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${me.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  useEffect(() => {
    if (!id) return;
    load();
    const ch = supabase.channel(`chat-${me.id}-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        const m = p.new as Message;
        const inThisChat =
          (m.sender_id === me.id && m.recipient_id === id) ||
          (m.sender_id === id && m.recipient_id === me.id);
        if (inThisChat) {
          setMessages((prev) => [...prev, m]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, me.id]);

  async function send() {
    const t = text.trim();
    if (!t || !id) return;
    setText('');
    await supabase.from('messages').insert({ sender_id: me.id, recipient_id: id, text: t });
  }

  if (!friend) {
    return (
      <View style={s.center}>
        <Text style={s.notFound}>{'> friend not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>{'< back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>{'< BACK'}</Text>
        </TouchableOpacity>
        {friend.avatar ? (
          <Image source={{ uri: friend.avatar }} style={s.headerAvatar} />
        ) : (
          <View style={s.headerAvatarBox}>
            <Text style={s.headerAvatarLetter}>{(friend.name[0] || '?').toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{friend.name}</Text>
          {friend.status ? (
            <Text style={s.headerStatus} numberOfLines={1}>{'> '}{friend.status}</Text>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: m }) => {
          const mine = m.sender_id === me.id;
          return (
            <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
              <Text style={[s.bubbleText, mine ? s.bubbleTextMine : s.bubbleTextTheirs]}>{m.text}</Text>
              <Text style={[s.bubbleTime, mine ? s.bubbleTimeMine : s.bubbleTimeTheirs]}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>{'> no messages. say hi.'}</Text>}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="type..."
          placeholderTextColor={DIM}
          value={text}
          onChangeText={setText}
          returnKeyType="send"
          onSubmitEditing={send}
          autoCapitalize="none"
        />
        <TouchableOpacity style={s.sendBtn} onPress={send}>
          <Text style={s.sendBtnText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  notFound: { fontFamily: FONT, color: GREEN, fontSize: 16, marginBottom: 20 },
  backBtn: { borderWidth: 1, borderColor: GREEN, padding: 12 },
  backText: { fontFamily: FONT, color: GREEN },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: DARK,
  },
  back: { fontFamily: FONT, color: GREEN, fontSize: 13 },
  headerAvatar: { width: 32, height: 32, borderWidth: 1, borderColor: GREEN },
  headerAvatarBox: {
    width: 32, height: 32, borderWidth: 1, borderColor: GREEN,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarLetter: { fontFamily: FONT, color: GREEN, fontSize: 15, fontWeight: 'bold' },
  headerName: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold' },
  headerStatus: { fontFamily: FONT, color: GREEN, fontSize: 11, opacity: 0.7, marginTop: 2 },
  listContent: { padding: 12, paddingBottom: 4 },
  empty: { fontFamily: FONT, color: DIM, fontSize: 13, textAlign: 'center', marginTop: 60 },
  bubble: { marginBottom: 6, padding: 10, maxWidth: '80%', borderWidth: 1 },
  bubbleMine: { alignSelf: 'flex-end', borderColor: GREEN, backgroundColor: '#001a00' },
  bubbleTheirs: { alignSelf: 'flex-start', borderColor: DARK, backgroundColor: '#000' },
  bubbleText: { fontFamily: FONT, fontSize: 14 },
  bubbleTextMine: { color: GREEN },
  bubbleTextTheirs: { color: GREEN },
  bubbleTime: { fontFamily: FONT, fontSize: 9, marginTop: 4 },
  bubbleTimeMine: { color: DIM, textAlign: 'right' },
  bubbleTimeTheirs: { color: DIM },
  inputRow: {
    flexDirection: 'row', padding: 10, gap: 8,
    borderTopWidth: 1, borderTopColor: DARK, backgroundColor: '#0a0a0a',
  },
  input: {
    flex: 1, fontFamily: FONT, color: GREEN, fontSize: 14,
    borderWidth: 1, borderColor: DARK, backgroundColor: '#000',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  sendBtn: { width: 44, borderWidth: 1, borderColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { fontFamily: FONT, color: GREEN, fontSize: 20, fontWeight: 'bold' },
});
