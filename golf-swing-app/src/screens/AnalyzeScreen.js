import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { extractFrames, analyzeSwing } from '../services/swingAnalyzer';
import { colors } from '../theme/colors';

const COACH_QUOTES = [
  'Studying your tempo…',
  'Checking your spine angle…',
  'Tracing the club path…',
  'Reading your weight transfer…',
  'Looking at impact position…',
  'Comparing to tour pros…',
  'Spotting the strokes you can save…',
  'Drafting your custom drills…',
];

export default function AnalyzeScreen({ route, navigation }) {
  const { videoUri, durationMs } = route.params;
  const [frames, setFrames] = useState([]);
  const [stage, setStage] = useState('extracting');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const cancelled = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    run();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (stage !== 'analyzing') return;
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      setQuoteIdx((i) => (i + 1) % COACH_QUOTES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [stage]);

  async function run() {
    try {
      setStage('extracting');
      const got = await extractFrames(videoUri, durationMs, (p) => {
        if (!cancelled.current) setProgress(p);
      });
      if (cancelled.current) return;
      setFrames(got);

      setStage('analyzing');
      const report = await analyzeSwing(got);
      if (cancelled.current) return;

      navigation.replace('Results', { report, frames: got, videoUri });
    } catch (e) {
      setError(e.message || String(e));
      setStage('error');
    }
  }

  const pct = Math.round((stage === 'analyzing' ? 1 : progress) * 100);
  const stageText =
    stage === 'extracting'
      ? 'CAPTURING KEYFRAMES'
      : stage === 'analyzing'
      ? 'AI COACH ANALYZING'
      : stage === 'error'
      ? 'SIGNAL LOST'
      : 'STAND BY';

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

      {/* Video viewport */}
      <View style={styles.videoFrame}>
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
        />
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        <View style={styles.hudBadge}>
          <Text style={styles.hudBadgeText}>● REC · SWING FEED</Text>
        </View>
      </View>

      {/* HUD status */}
      <View style={styles.hud}>
        <View style={styles.hudRow}>
          <Animated.View
            style={[
              styles.statusDot,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1.15],
                    }),
                  },
                ],
              },
            ]}
          />
          <Text style={styles.hudLabel}>STATUS</Text>
          <Text style={styles.hudValue}>{stageText}</Text>
          {stage !== 'error' && <ActivityIndicator color={colors.fairwayHi} />}
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[colors.fairwayHi, colors.fairwayDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${pct}%` }]}
          />
        </View>
        <View style={styles.hudRow}>
          {stage === 'analyzing' ? (
            <Animated.Text style={[styles.hudSmall, { opacity: fade, flex: 1 }]}>
              {COACH_QUOTES[quoteIdx]}
            </Animated.Text>
          ) : (
            <Text style={[styles.hudSmall, { flex: 1 }]}>
              {stage === 'extracting'
                ? `Frame ${Math.min(8, Math.round(progress * 8))} / 8`
                : stage === 'error'
                ? '—'
                : 'Loading'}
            </Text>
          )}
          <Text style={styles.hudSmall}>{pct}%</Text>
        </View>
      </View>

      {stage === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>SIGNAL LOST</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              run();
            }}
          >
            <Text style={styles.retryBtnText}>↻  RETRY ANALYSIS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>BACK TO MENU</Text>
          </TouchableOpacity>
        </View>
      )}

      {frames.length > 0 && (
        <View style={styles.framesWrap}>
          <Text style={styles.framesTitle}>KEY MOMENTS</Text>
          <View style={styles.framesGrid}>
            {frames.map((f) => (
              <View key={f.order} style={styles.frameCard}>
                {f.uri ? (
                  <Image source={{ uri: f.uri }} style={styles.frameImg} />
                ) : (
                  <View style={[styles.frameImg, styles.frameMissing]}>
                    <Text style={{ color: colors.silverDim }}>—</Text>
                  </View>
                )}
                <View style={styles.frameLabelBar}>
                  <Text style={styles.frameOrder}>F{f.order + 1}</Text>
                  <Text style={styles.frameLabel} numberOfLines={1}>
                    {f.label.split(' (')[0]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  videoFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: '#000',
    marginBottom: 14,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
  },
  hudBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(2,8,10,0.85)',
    borderWidth: 1,
    borderColor: colors.fairwayHi,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hudBadgeText: {
    color: colors.fairwayHi,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '900',
  },
  cornerTL: { position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.fairwayHi },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 3, borderRightWidth: 3, borderColor: colors.fairwayHi },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: colors.fairwayHi },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 3, borderRightWidth: 3, borderColor: colors.fairwayHi },

  hud: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
    marginBottom: 14,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.fairwayHi,
    marginRight: 10,
    shadowColor: colors.fairwayHi,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  hudLabel: {
    color: colors.silverDim,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  hudValue: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.4,
    fontStyle: 'italic',
    marginHorizontal: 10,
    textAlign: 'right',
  },
  hudSmall: {
    color: colors.silver,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#040A06',
    borderWidth: 1,
    borderColor: colors.panelBorder,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
  },

  framesWrap: {
    backgroundColor: colors.panel,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  framesTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: colors.gold,
    marginBottom: 10,
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  framesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  frameCard: {
    width: '48%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: '#02080A',
  },
  frameImg: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  frameMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameLabelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
    backgroundColor: colors.panelHi,
  },
  frameOrder: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
    marginRight: 6,
  },
  frameLabel: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  errorBox: {
    backgroundColor: '#1A0509',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.danger,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.danger,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.silver,
    marginBottom: 12,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.fairwayDeep,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.fairwayHi,
    marginBottom: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 13,
  },
  backBtn: {
    padding: 10,
    alignItems: 'center',
  },
  backBtnText: {
    color: colors.silverDim,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 11,
  },
});
