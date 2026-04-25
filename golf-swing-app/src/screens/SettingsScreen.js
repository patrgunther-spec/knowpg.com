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
import { LinearGradient } from 'expo-linear-gradient';
import { getApiKey, setApiKey } from '../services/swingAnalyzer';
import { colors } from '../theme/colors';
import GameButton from '../components/GameButton';

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
      Alert.alert('Hold On', 'Paste your Claude API key first.');
      return;
    }
    if (!key.trim().startsWith('sk-')) {
      Alert.alert(
        'Looks Wrong',
        'A Claude API key usually starts with "sk-". Double-check it.'
      );
      return;
    }
    await setApiKey(key);
    Alert.alert('Saved', 'You can now analyze swings.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  async function clear() {
    await setApiKey('');
    setKey('');
    Alert.alert('Cleared', 'Key removed from this device.');
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.bgGradTop, colors.bg, colors.bgGradBottom]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardFrame}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>STEP 01</Text>
          <Text style={styles.title}>GET YOUR KEY</Text>
          <Text style={styles.body}>
            The app talks to Claude AI to grade your swing. You need a free
            Claude API key (about 2 minutes to make).
          </Text>
          <GameButton
            icon="🔑"
            label="Open Claude Console"
            caption="console.anthropic.com"
            variant="gold"
            onPress={() =>
              Linking.openURL('https://console.anthropic.com/settings/keys')
            }
          />
        </View>
      </View>

      <View style={styles.cardFrame}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>STEP 02</Text>
          <Text style={styles.title}>PASTE IT HERE</Text>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="sk-ant-..."
            placeholderTextColor={colors.silverDim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={loaded}
          />
          <GameButton
            icon="✓"
            label="Save Key"
            caption="Stored only on this device"
            onPress={save}
          />
          {!!key && (
            <TouchableOpacity style={styles.clearBtn} onPress={clear}>
              <Text style={styles.clearBtnText}>REMOVE KEY</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.safeFrame}>
        <View style={styles.safeCard}>
          <Text style={styles.safeLabel}>🔒  PRIVACY</Text>
          <Text style={styles.body}>
            Your key is stored only on this phone. Swing frames go directly
            from your phone to Anthropic. No middleman, no accounts.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 40 },
  cardFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 2,
    backgroundColor: '#02080A',
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.panel,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.white,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: colors.silver,
    lineHeight: 19,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 12,
    fontSize: 13,
    marginVertical: 10,
    backgroundColor: '#02080A',
    color: colors.white,
    letterSpacing: 1,
  },
  clearBtn: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
  },
  clearBtnText: {
    color: colors.danger,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
  },
  safeFrame: {
    borderWidth: 2,
    borderColor: colors.fairwayDeep,
    padding: 2,
    backgroundColor: '#02080A',
  },
  safeCard: {
    backgroundColor: '#0A1F14',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.fairwayDeep,
  },
  safeLabel: {
    fontWeight: '900',
    color: colors.fairwayHi,
    letterSpacing: 2.5,
    fontSize: 11,
    marginBottom: 6,
  },
});
