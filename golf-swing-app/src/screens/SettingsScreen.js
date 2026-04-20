import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { getApiKey, setApiKey } from '../services/swingAnalyzer';
import { colors } from '../theme/colors';

export default function SettingsScreen({ navigation }) {
  const [key, setKey] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await getApiKey();
      if (existing) setKey(existing);
      setLoaded(true);
    })();
  }, []);

  async function save() {
    if (!key.trim()) {
      Alert.alert('Hmm', 'Please paste your Claude API key first.');
      return;
    }
    if (!key.trim().startsWith('sk-')) {
      Alert.alert(
        'That doesn\'t look right',
        'A Claude API key usually starts with "sk-". Double-check it.'
      );
      return;
    }
    await setApiKey(key);
    Alert.alert('Saved!', 'You can now analyze swings.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  async function clear() {
    await setApiKey('');
    setKey('');
    Alert.alert('Cleared', 'Key removed from this phone.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>One-Time Setup</Text>
        <Text style={styles.body}>
          This app uses Claude (an AI coach) to look at your swing. To talk to
          Claude, we need a small secret called an <Text style={styles.bold}>API key</Text>.
          A grown-up can get one for free to start.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.stepTitle}>Step 1 — Get a key</Text>
        <Text style={styles.body}>
          Go to console.anthropic.com, sign in, and make a new API key.
        </Text>
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
        >
          <Text style={styles.linkBtnText}>Open Claude Console</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.stepTitle}>Step 2 — Paste it here</Text>
        <TextInput
          style={styles.input}
          value={key}
          onChangeText={setKey}
          placeholder="sk-ant-..."
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          editable={loaded}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>Save Key</Text>
        </TouchableOpacity>
        {!!key && (
          <TouchableOpacity style={styles.clearBtn} onPress={clear}>
            <Text style={styles.clearBtnText}>Remove Key</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.card, styles.safeCard]}>
        <Text style={styles.safeLabel}>🔒 Your key stays on your phone.</Text>
        <Text style={styles.body}>
          We save it only on this device. We don't send it anywhere except
          directly to Claude when we analyze your swing.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.fairway,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  bold: { fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: colors.sand,
  },
  saveBtn: {
    backgroundColor: colors.fairway,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '800',
  },
  clearBtn: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
  },
  clearBtnText: {
    color: colors.danger,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: 10,
    backgroundColor: colors.sun,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkBtnText: {
    color: colors.ink,
    fontWeight: '800',
  },
  safeCard: {
    backgroundColor: colors.fairwayLight,
    borderColor: colors.fairway,
  },
  safeLabel: {
    fontWeight: '800',
    color: colors.fairway,
    marginBottom: 4,
  },
});
