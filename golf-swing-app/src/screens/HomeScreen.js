import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import GameButton from '../components/GameButton';

const KEY_STORAGE = 'CLAUDE_API_KEY';

export default function HomeScreen({ navigation }) {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', checkKey);
    return unsubscribe;
  }, [navigation]);

  async function checkKey() {
    const k = await AsyncStorage.getItem(KEY_STORAGE);
    setHasKey(!!k);
  }

  function requireKey() {
    if (hasKey) return true;
    Alert.alert(
      'Setup Needed',
      'Open Tournament Setup and add your Claude API key to start the round.'
    );
    return false;
  }

  async function pickVideo() {
    if (!requireKey()) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Access Denied', 'Photo library access is required to load a swing.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const a = result.assets[0];
      navigation.navigate('Analyze', { videoUri: a.uri, durationMs: a.duration });
    }
  }

  async function recordVideo() {
    if (!requireKey()) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Access Denied', 'Camera access is required to record a swing.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 15,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const a = result.assets[0];
      navigation.navigate('Analyze', { videoUri: a.uri, durationMs: a.duration });
    }
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

      {/* Hero */}
      <View style={styles.heroFrame}>
        <LinearGradient
          colors={['#0A2418', '#06120C']}
          style={styles.hero}
        >
          <Text style={styles.eyebrow}>Pro Series · Swing Coach</Text>
          <Text style={styles.title}>
            DRIVE.{'\n'}
            <Text style={styles.titleAccent}>ANALYZE.</Text>
            {'\n'}DOMINATE.
          </Text>
          <Text style={styles.subtitle}>
            Capture your swing. Our AI coach scans 8 key frames and grades your
            game with drills to fix what's costing you strokes.
          </Text>
          <View style={styles.statRow}>
            <Stat label="Frames" value="8" />
            <Sep />
            <Stat label="Drills" value="3–5" />
            <Sep />
            <Stat label="Tips" value="∞" />
          </View>
        </LinearGradient>
      </View>

      {/* Main menu */}
      <SectionLabel text="Main Menu" />
      <GameButton
        icon="📹"
        label="Quick Round"
        caption="Record a new swing now"
        onPress={recordVideo}
      />
      <GameButton
        icon="📁"
        label="Load Swing"
        caption="Pick a video from your library"
        onPress={pickVideo}
        variant="gold"
      />
      <GameButton
        icon="⚙️"
        label={hasKey ? 'Tournament Setup · Ready' : 'Tournament Setup · Required'}
        caption={hasKey ? 'API key is loaded' : 'Add Claude API key to play'}
        onPress={() => navigation.navigate('Settings')}
        variant="ghost"
      />

      {/* How it works */}
      <SectionLabel text="How To Play" />
      <View style={styles.howCard}>
        <HowRow
          n="01"
          title="Frame Up"
          text="Stand 8–10 feet to the side. Show head to feet."
        />
        <HowRow
          n="02"
          title="Take The Cut"
          text="Record or upload a 3–10 second swing."
        />
        <HowRow
          n="03"
          title="Get Graded"
          text="See power, tempo, balance + custom drills."
        />
      </View>

      <View style={{ height: 24 }} />
      <Text style={styles.footer}>
        BUILT WITH CLAUDE VISION · NOT AFFILIATED WITH PGA TOUR
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Sep() {
  return <View style={styles.statSep} />;
}

function SectionLabel({ text }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionLabel}>{text}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function HowRow({ n, title, text }) {
  return (
    <View style={styles.howRow}>
      <Text style={styles.howNum}>{n}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.howTitle}>{title}</Text>
        <Text style={styles.howText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heroFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 2,
    backgroundColor: '#02080A',
    marginBottom: 18,
  },
  hero: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    lineHeight: 38,
    textTransform: 'uppercase',
  },
  titleAccent: {
    color: colors.fairwayHi,
  },
  subtitle: {
    color: colors.silver,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.fairwayHi,
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  statLabel: {
    color: colors.silverDim,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statSep: {
    width: 1,
    backgroundColor: colors.panelBorder,
    marginVertical: 4,
  },
  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.panelBorder,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginHorizontal: 12,
    fontStyle: 'italic',
  },
  howCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  howNum: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    width: 56,
  },
  howTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  howText: {
    color: colors.silver,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    color: colors.silverDim,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '700',
  },
});
