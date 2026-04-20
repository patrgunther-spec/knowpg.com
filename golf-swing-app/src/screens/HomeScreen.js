import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

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

  async function pickVideo() {
    if (!hasKey) {
      Alert.alert(
        'One small setup step',
        'Tap the Setup button first to add your Claude API key. A grown-up can help.'
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Oops', 'Please allow photo library access so we can pick your swing video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      navigation.navigate('Analyze', { videoUri: result.assets[0].uri });
    }
  }

  async function recordVideo() {
    if (!hasKey) {
      Alert.alert(
        'One small setup step',
        'Tap the Setup button first to add your Claude API key. A grown-up can help.'
      );
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Oops', 'Please allow camera access so you can record a swing.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 15,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      navigation.navigate('Analyze', { videoUri: result.assets[0].uri });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Hi! I'm your Swing Coach.</Text>
        <Text style={styles.subtitle}>
          Show me your golf swing and I'll tell you what to fix — in easy words.
        </Text>
      </View>

      <View style={styles.steps}>
        <StepCard number="1" text="Record or pick a video of your swing." />
        <StepCard number="2" text="I look at the important moments." />
        <StepCard number="3" text="You get tips and fun drills to try." />
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={recordVideo}>
        <Text style={styles.primaryBtnText}>📹  Record a Swing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={pickVideo}>
        <Text style={styles.secondaryBtnText}>📁  Pick a Swing Video</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.settingsBtnText}>
          {hasKey ? '⚙️  Setup (done)' : '⚙️  Setup (needed)'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.tip}>
        Tip: Film from the side so we can see your whole body.
      </Text>
    </ScrollView>
  );
}

function StepCard({ number, text }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: colors.sky,
  },
  hero: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inkSoft,
    lineHeight: 22,
  },
  steps: {
    marginBottom: 18,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fairwayLight,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.fairway,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  primaryBtn: {
    backgroundColor: colors.fairway,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: colors.sun,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  settingsBtn: {
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  settingsBtnText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  tip: {
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 13,
    marginTop: 4,
  },
});
