import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { extractFrames, analyzeSwing } from '../services/swingAnalyzer';
import { colors } from '../theme/colors';

export default function AnalyzeScreen({ route, navigation }) {
  const { videoUri, durationMs } = route.params;
  const [frames, setFrames] = useState([]);
  const [stage, setStage] = useState('extracting');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const cancelled = useRef(false);

  useEffect(() => {
    run();
    return () => {
      cancelled.current = true;
    };
  }, []);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Video
        source={{ uri: videoUri }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
      />

      {stage === 'extracting' && (
        <StatusCard
          icon="🎞️"
          title="Finding the important moments…"
          detail={`Looking at frame ${Math.round(progress * 8)} of 8`}
        />
      )}

      {stage === 'analyzing' && (
        <StatusCard
          icon="🧠"
          title="Coach is watching your swing…"
          detail="This takes a few seconds."
        />
      )}

      {stage === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Uh oh!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              run();
            }}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {frames.length > 0 && (
        <View style={styles.framesWrap}>
          <Text style={styles.framesTitle}>Key Moments</Text>
          <View style={styles.framesGrid}>
            {frames.map((f) => (
              <View key={f.order} style={styles.frameCard}>
                {f.uri ? (
                  <Image source={{ uri: f.uri }} style={styles.frameImg} />
                ) : (
                  <View style={[styles.frameImg, styles.frameMissing]}>
                    <Text>—</Text>
                  </View>
                )}
                <Text style={styles.frameLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function StatusCard({ icon, title, detail }) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusDetail}>{detail}</Text>
      </View>
      <ActivityIndicator color={colors.fairway} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  video: {
    width: '100%',
    height: 240,
    backgroundColor: colors.ink,
    borderRadius: 16,
    marginBottom: 14,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  statusDetail: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  framesWrap: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  framesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: colors.ink,
  },
  framesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  frameCard: {
    width: '48%',
    marginBottom: 10,
  },
  frameImg: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 10,
    backgroundColor: colors.sand,
  },
  frameMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameLabel: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: colors.ink,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: colors.fairway,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
  backBtn: {
    padding: 10,
    alignItems: 'center',
  },
  backBtnText: {
    color: colors.inkSoft,
    fontWeight: '600',
  },
});
