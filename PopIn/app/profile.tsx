import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from './_layout';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';

export default function ProfileScreen() {
  const router = useRouter();
  const { userName, setUserName, friendCode, userStatus, setUserStatus, profile, updateProfile } = useApp();

  const [nameVal, setNameVal] = useState(userName);
  const [statusVal, setStatusVal] = useState(userStatus);
  const [websiteVal, setWebsiteVal] = useState(profile.website);
  const [homeVal, setHomeVal] = useState(profile.homeLocation);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      updateProfile({ avatar: result.assets[0].uri });
    }
  }

  function save() {
    const n = nameVal.trim();
    if (!n) return Alert.alert('', 'name required');
    setUserName(n);
    setUserStatus(statusVal.trim());
    updateProfile({
      website: websiteVal.trim(),
      homeLocation: homeVal.trim(),
    });
    router.back();
  }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>{'< BACK'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{'> PROFILE'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity style={s.avatarBox} onPress={pickAvatar}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={s.avatarImg} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarLetter}>{userName[0].toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.avatarHint}>{'> TAP TO CHANGE'}</Text>
        </TouchableOpacity>

        <Text style={s.label}>{'> HANDLE'}</Text>
        <TextInput
          style={s.input}
          value={nameVal}
          onChangeText={setNameVal}
          placeholderTextColor="#006620"
          autoCapitalize="none"
        />

        <Text style={s.label}>{'> STATUS'}</Text>
        <TextInput
          style={s.input}
          value={statusVal}
          onChangeText={setStatusVal}
          placeholder="what are you up to..."
          placeholderTextColor="#006620"
          autoCapitalize="none"
        />

        <Text style={s.label}>{'> HOME LOCATION'}</Text>
        <TextInput
          style={s.input}
          value={homeVal}
          onChangeText={setHomeVal}
          placeholder="brooklyn, ny..."
          placeholderTextColor="#006620"
          autoCapitalize="none"
        />

        <Text style={s.label}>{'> WEBSITE'}</Text>
        <TextInput
          style={s.input}
          value={websiteVal}
          onChangeText={setWebsiteVal}
          placeholder="yoursite.com..."
          placeholderTextColor="#006620"
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={s.codeRow}>
          <Text style={s.codeLabel}>{'> FRIEND CODE'}</Text>
          <Text style={s.codeValue}>{friendCode}</Text>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveBtnText}>{'> SAVE'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#003300',
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  back: { fontFamily: FONT, color: GREEN, fontSize: 14 },
  headerTitle: { fontFamily: FONT, color: GREEN, fontSize: 20, fontWeight: 'bold' },
  content: { padding: 24, paddingBottom: 60 },
  avatarBox: { alignItems: 'center', marginBottom: 32 },
  avatarImg: { width: 80, height: 80, borderWidth: 1, borderColor: GREEN },
  avatarPlaceholder: {
    width: 80, height: 80, borderWidth: 1, borderColor: GREEN,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { fontFamily: FONT, color: GREEN, fontSize: 36, fontWeight: 'bold' },
  avatarHint: { fontFamily: FONT, color: '#006620', fontSize: 11, marginTop: 8 },
  label: { fontFamily: FONT, color: '#006620', fontSize: 12, marginBottom: 6, letterSpacing: 1 },
  input: {
    fontFamily: FONT, color: GREEN, fontSize: 16,
    borderWidth: 1, borderColor: '#003300', backgroundColor: '#000',
    padding: 14, marginBottom: 20,
  },
  codeRow: {
    borderWidth: 1, borderColor: '#003300', padding: 16, marginBottom: 28,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  codeLabel: { fontFamily: FONT, color: '#006620', fontSize: 12 },
  codeValue: { fontFamily: FONT, color: GREEN, fontSize: 20, fontWeight: 'bold', letterSpacing: 4 },
  saveBtn: { borderWidth: 1, borderColor: GREEN, padding: 18, alignItems: 'center' },
  saveBtnText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
});
