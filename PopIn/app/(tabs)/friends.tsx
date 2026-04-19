import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Alert, StyleSheet, Share, Modal,
} from 'react-native';
import {
  doc, getDoc, onSnapshot, query, collection,
  where, updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

type Friend = { id: string; displayName: string };

export default function FriendsTab() {
  const user = auth.currentUser!;
  const [myCode, setMyCode]       = useState('');
  const [friends, setFriends]     = useState<Friend[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [adding, setAdding]       = useState(false);

  // Load my friend code + live friend list
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      const data = snap.data();
      setMyCode(data?.friendCode ?? '');

      const ids: string[] = data?.friendIds ?? [];
      if (ids.length === 0) { setFriends([]); return; }

      // Fetch display names for each friend
      const profiles = await Promise.all(
        ids.map((id) => getDoc(doc(db, 'users', id))),
      );
      setFriends(
        profiles
          .filter((s) => s.exists())
          .map((s) => ({ id: s.id, displayName: s.data()!.displayName })),
      );
    });
    return unsub;
  }, []);

  async function addFriend() {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 6) return Alert.alert('Codes are 6 characters');
    if (code === myCode)   return Alert.alert("That's your own code!");
    setAdding(true);
    try {
      // Find the user with that code
      const snap = await getDoc(
        doc(db, 'users', (await findByCode(code)) ?? '__none__'),
      );
      // findByCode queries by friendCode field
      const friendId = await findByCode(code);
      if (!friendId) {
        Alert.alert('No one found', 'Double-check the code and try again.');
        setAdding(false);
        return;
      }
      if (friends.some((f) => f.id === friendId)) {
        Alert.alert('Already friends!');
        setAdding(false);
        return;
      }
      const friendSnap = await getDoc(doc(db, 'users', friendId));
      const friendName = friendSnap.data()?.displayName ?? 'Friend';

      // Add each other
      await updateDoc(doc(db, 'users', user.uid),  { friendIds: arrayUnion(friendId) });
      await updateDoc(doc(db, 'users', friendId),  { friendIds: arrayUnion(user.uid) });

      Alert.alert('✅ Added!', `${friendName} is now your friend.`);
      setCodeInput('');
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setAdding(false);
  }

  async function removeFriend(friendId: string) {
    await updateDoc(doc(db, 'users', user.uid),   { friendIds: arrayRemove(friendId) });
    await updateDoc(doc(db, 'users', friendId), { friendIds: arrayRemove(user.uid) });
  }

  function shareCode() {
    Share.share({ message: `Add me on Pop In! My code is ${myCode}` });
  }

  return (
    <View style={s.page}>
      {/* Your code */}
      <View style={s.codeCard}>
        <Text style={s.codeLabel}>YOUR FRIEND CODE</Text>
        <Text style={s.code}>{myCode}</Text>
        <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
          <Text style={s.shareBtnText}>Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Friend list */}
      <View style={s.listHeader}>
        <Text style={s.listTitle}>Friends ({friends.length})</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {friends.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No friends yet — share your code!</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: f }) => (
            <View style={s.friendRow}>
              <Text style={s.friendName}>{f.displayName}</Text>
              <TouchableOpacity onPress={() => removeFriend(f.id)}>
                <Text style={s.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add friend sheet */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Add a Friend</Text>
          <Text style={s.sheetSub}>
            Ask your friend for their 6-character code from this screen, then type it below.
          </Text>
          <TextInput
            style={[s.input, { letterSpacing: 6, textAlign: 'center', fontSize: 24, fontWeight: 'bold' }]}
            placeholder="AB3F7K"
            value={codeInput}
            onChangeText={(t) => setCodeInput(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity style={s.addBig} onPress={addFriend} disabled={adding}>
            <Text style={s.addBigText}>{adding ? 'Adding…' : 'Add Friend'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancel} onPress={() => setShowAdd(false)}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// Query Firestore for a user with the given friendCode
async function findByCode(code: string): Promise<string | null> {
  const { getDocs, query, collection, where } = await import('firebase/firestore');
  const { db } = await import('../../services/firebase');
  const snap = await getDocs(
    query(collection(db, 'users'), where('friendCode', '==', code)),
  );
  return snap.empty ? null : snap.docs[0].id;
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#f5f5f5' },
  codeCard:    { margin: 16, backgroundColor: '#007AFF', borderRadius: 18, padding: 24, alignItems: 'center' },
  codeLabel:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  code:        { color: '#fff', fontSize: 40, fontWeight: 'bold', letterSpacing: 6, marginBottom: 16 },
  shareBtn:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  shareBtnText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
  listHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  listTitle:   { fontSize: 18, fontWeight: '600' },
  addBtn:      { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontWeight: '600' },
  empty:       { padding: 40, alignItems: 'center' },
  emptyText:   { color: '#888', fontSize: 15 },
  friendRow:   { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  friendName:  { fontSize: 16, fontWeight: '500' },
  remove:      { color: '#ff3b30', fontSize: 14 },
  sheet:       { flex: 1, padding: 28, paddingTop: 40 },
  sheetTitle:  { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  sheetSub:    { fontSize: 15, color: '#666', marginBottom: 28, lineHeight: 22 },
  input:       { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, backgroundColor: '#f9f9f9' },
  addBig:      { backgroundColor: '#007AFF', borderRadius: 14, padding: 18, alignItems: 'center' },
  addBigText:  { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancel:      { padding: 16, alignItems: 'center' },
  cancelText:  { color: '#888', fontSize: 16 },
});
