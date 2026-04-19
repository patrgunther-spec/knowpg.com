import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList, Image,
  StyleSheet, Share, Platform, Alert, Modal,
} from 'react-native';
import { useApp } from '../_layout';
import { supabase } from '../../lib/supabase';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const DIM = '#006620';
const DARK = '#003300';
const RED = '#ff3333';

export default function FriendsTab() {
  const { me, friends, refreshFriends, signOut } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [adding, setAdding] = useState(false);

  function shareCode() {
    Share.share({ message: `pop in. my code: ${me.friend_code}` });
  }

  async function addFriend() {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 6) return Alert.alert('', 'enter 6-character code');
    if (code === me.friend_code) return Alert.alert('', "that's your own code");
    setAdding(true);
    try {
      const { data: target } = await supabase.from('profiles').select('id, name').eq('friend_code', code).maybeSingle();
      if (!target) { Alert.alert('', 'code not found'); return; }
      const { error } = await supabase.from('friends').insert([
        { user_id: me.id, friend_id: target.id },
      ]);
      if (error && !error.message.includes('duplicate')) {
        Alert.alert('', error.message);
        return;
      }
      await supabase.from('friends').insert([
        { user_id: target.id, friend_id: me.id },
      ]);
      await refreshFriends();
      setCodeInput('');
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  }

  async function removeFriend(id: string, name: string) {
    Alert.alert('', `remove ${name}?`, [
      { text: 'cancel' },
      {
        text: 'remove', style: 'destructive', onPress: async () => {
          await supabase.from('friends').delete().eq('user_id', me.id).eq('friend_id', id);
          await supabase.from('friends').delete().eq('user_id', id).eq('friend_id', me.id);
          await refreshFriends();
        },
      },
    ]);
  }

  function confirmSignOut() {
    Alert.alert('', 'sign out?', [
      { text: 'cancel' },
      { text: 'sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerText}>{'> FRIENDS'}</Text>
      </View>

      <View style={s.codeCard}>
        <Text style={s.codeLabel}>{'> YOUR FRIEND CODE'}</Text>
        <Text style={s.code}>{me.friend_code}</Text>
        <View style={s.codeBtnRow}>
          <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
            <Text style={s.shareBtnText}>{'> SHARE'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={s.shareBtnText}>{'+ ADD'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.sectionLabel}>{'> CONNECTED ('}{friends.length}{')'}</Text>

      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={s.empty}>{'> no friends yet. share your code.'}</Text>
        }
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={s.friend}
            onLongPress={() => removeFriend(f.id, f.name)}
          >
            {f.avatar ? (
              <Image source={{ uri: f.avatar }} style={s.friendAvatar} />
            ) : (
              <View style={s.friendAvatarBox}>
                <Text style={s.friendAvatarLetter}>{(f.name[0] || '?').toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.friendName}>{f.name}</Text>
              {f.status ? (
                <Text style={s.friendStatus} numberOfLines={1}>{'> '}{f.status}</Text>
              ) : (
                <Text style={s.friendOffline}>{'> idle'}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.signOut} onPress={confirmSignOut}>
        <Text style={s.signOutText}>{'> SIGN OUT'}</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <Text style={s.modalTitle}>{'> ADD FRIEND'}</Text>
          <Text style={s.modalSub}>{'> enter their 6-character code'}</Text>
          <TextInput
            style={s.modalInput}
            placeholder="ABC123"
            placeholderTextColor={DIM}
            value={codeInput}
            onChangeText={(t) => setCodeInput(t.toUpperCase())}
            autoFocus
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity style={s.modalBtn} onPress={addFriend} disabled={adding}>
            <Text style={s.modalBtnText}>{adding ? '> ADDING...' : '> ADD'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalCancel} onPress={() => setShowAdd(false)}>
            <Text style={s.modalCancelText}>{'> CANCEL'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  codeCard: {
    margin: 16, backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    padding: 20, alignItems: 'center',
  },
  codeLabel: { fontFamily: FONT, color: DIM, fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  code: { fontFamily: FONT, color: GREEN, fontSize: 36, fontWeight: 'bold', letterSpacing: 6, marginBottom: 16 },
  codeBtnRow: { flexDirection: 'row', gap: 12 },
  shareBtn: { borderWidth: 1, borderColor: GREEN, paddingHorizontal: 20, paddingVertical: 10 },
  addBtn: { borderWidth: 1, borderColor: GREEN, paddingHorizontal: 20, paddingVertical: 10 },
  shareBtnText: { fontFamily: FONT, color: GREEN, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  sectionLabel: { fontFamily: FONT, color: DIM, fontSize: 12, letterSpacing: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  empty: { fontFamily: FONT, color: DIM, fontSize: 13, textAlign: 'center', padding: 24 },
  friend: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, padding: 12,
    borderWidth: 1, borderColor: DARK, backgroundColor: '#000',
  },
  friendAvatar: { width: 36, height: 36, borderWidth: 1, borderColor: GREEN },
  friendAvatarBox: {
    width: 36, height: 36, borderWidth: 1, borderColor: GREEN,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  friendAvatarLetter: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold' },
  friendName: { fontFamily: FONT, color: GREEN, fontSize: 15, fontWeight: 'bold' },
  friendStatus: { fontFamily: FONT, color: GREEN, fontSize: 11, marginTop: 2, opacity: 0.8 },
  friendOffline: { fontFamily: FONT, color: DIM, fontSize: 11, marginTop: 2 },
  signOut: {
    marginHorizontal: 16, marginBottom: 24,
    borderWidth: 1, borderColor: RED, padding: 12, alignItems: 'center',
  },
  signOutText: { fontFamily: FONT, color: RED, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 28, paddingTop: 60 },
  modalTitle: { fontFamily: FONT, color: GREEN, fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  modalSub: { fontFamily: FONT, color: DIM, fontSize: 13, marginBottom: 20 },
  modalInput: {
    fontFamily: FONT, color: GREEN, fontSize: 28, letterSpacing: 8, textAlign: 'center',
    borderWidth: 1, borderColor: GREEN, backgroundColor: '#000',
    padding: 20, marginBottom: 20,
  },
  modalBtn: { borderWidth: 1, borderColor: GREEN, padding: 18, alignItems: 'center', marginBottom: 12 },
  modalBtnText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  modalCancel: { padding: 18, alignItems: 'center' },
  modalCancelText: { fontFamily: FONT, color: DIM, fontSize: 16 },
});
