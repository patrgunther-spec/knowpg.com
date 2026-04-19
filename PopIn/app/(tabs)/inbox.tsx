import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, Message, Profile } from '../_layout';
import { supabase } from '../../lib/supabase';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const DIM = '#006620';
const DARK = '#003300';

type ConvPreview = { friend: Profile; last: Message };

export default function InboxTab() {
  const { me, friends } = useApp();
  const router = useRouter();
  const [previews, setPreviews] = useState<ConvPreview[]>([]);

  async function load() {
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
      .order('created_at', { ascending: false });
    if (!data) return;
    const msgs = data as Message[];
    const seen = new Set<string>();
    const out: ConvPreview[] = [];
    for (const m of msgs) {
      const otherId = m.sender_id === me.id ? m.recipient_id : m.sender_id;
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      const friend = friends.find((f) => f.id === otherId);
      if (friend) out.push({ friend, last: m });
    }
    setPreviews(out);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel('inbox-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me.id, friends.length]);

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerText}>{'> INBOX'}</Text>
      </View>

      {previews.length === 0 && friends.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyBox}>{'[  ]'}</Text>
          <Text style={s.emptyTitle}>{'> NO CONNECTIONS'}</Text>
          <Text style={s.emptyText}>{'> add friends to start chatting'}</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          ListHeaderComponent={<Text style={s.sectionLabel}>{'> TAP A FRIEND TO CHAT'}</Text>}
          renderItem={({ item: f }) => {
            const prev = previews.find((p) => p.friend.id === f.id);
            return (
              <TouchableOpacity style={s.row} onPress={() => router.push(`/chat/${f.id}`)}>
                {f.avatar ? (
                  <Image source={{ uri: f.avatar }} style={s.avatar} />
                ) : (
                  <View style={s.avatarBox}>
                    <Text style={s.avatarLetter}>{(f.name[0] || '?').toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{f.name}</Text>
                  <Text style={s.preview} numberOfLines={1}>
                    {prev ? (prev.last.sender_id === me.id ? '> you: ' : '> ') + prev.last.text : '> no messages yet'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: DARK,
  },
  headerText: { fontFamily: FONT, color: GREEN, fontSize: 22, fontWeight: 'bold' },
  sectionLabel: { fontFamily: FONT, color: DIM, fontSize: 11, letterSpacing: 1, padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyBox: { fontFamily: FONT, color: DARK, fontSize: 48, marginBottom: 20 },
  emptyTitle: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { fontFamily: FONT, color: DIM, fontSize: 13, textAlign: 'center', lineHeight: 22 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DARK,
  },
  avatar: { width: 40, height: 40, borderWidth: 1, borderColor: GREEN },
  avatarBox: {
    width: 40, height: 40, borderWidth: 1, borderColor: GREEN,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  name: { fontFamily: FONT, color: GREEN, fontSize: 15, fontWeight: 'bold' },
  preview: { fontFamily: FONT, color: DIM, fontSize: 12, marginTop: 2 },
});
