import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function SignIn() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);

  async function submit() {
    if (!email || !password) return Alert.alert('Fill in email and password');
    if (isSignUp && !name)   return Alert.alert('Enter your name');
    setBusy(true);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        // Save user profile to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          displayName: name,
          friendCode: makeCode(),
          friendIds: [],
          createdAt: new Date(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      Alert.alert('Oops', e.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={s.emoji}>👋</Text>
      <Text style={s.title}>Pop In</Text>
      <Text style={s.sub}>Let your friends know where you're at.</Text>

      {isSignUp && (
        <TextInput
          style={s.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={s.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={s.input}
        placeholder="Password (6+ characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>
          {busy ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={s.toggle}>
          {isSignUp
            ? 'Already have an account?  Sign In'
            : "Don't have an account?  Sign Up"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page:    { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  emoji:   { fontSize: 72, textAlign: 'center', marginBottom: 8 },
  title:   { fontSize: 42, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  sub:     { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 40 },
  input:   { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#f9f9f9' },
  btn:     { backgroundColor: '#007AFF', borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  toggle:  { textAlign: 'center', marginTop: 24, color: '#007AFF', fontSize: 15 },
});
