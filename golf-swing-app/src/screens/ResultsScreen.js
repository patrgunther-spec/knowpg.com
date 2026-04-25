import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import GameButton from '../components/GameButton';

function priorityTone(p) {
  const v = String(p || '').toLowerCase();
  if (v === 'high') return colors.danger;
  if (v === 'medium') return colors.gold;
  return colors.fairwayHi;
}

export default function ResultsScreen({ route, navigation }) {
  const { report, frames } = route.params;
  const [openFrame, setOpenFrame] = useState(null);
  const takeaways = report.takeaways || [];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  }, []);

  const toggleFrame = (i) => {
    Haptics.selectionAsync().catch(() => {});
    setOpenFrame((cur) => (cur === i ? null : i));
  };

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

      {/* Header card */}
      <View style={styles.cardFrame}>
        <LinearGradient colors={['#0E2418', '#04100A']} style={styles.headerCard}>
          <Text style={styles.eyebrow}>SWING REPORT</Text>
          <Text style={styles.handle} numberOfLines={2}>
            {report.playerHandle || 'The Player'}
          </Text>
          <Text style={styles.summary}>{report.summary}</Text>
          <View style={styles.goodBox}>
            <Text style={styles.goodLabel}>★  ONE THING YOU DID WELL</Text>
            <Text style={styles.goodText}>{report.oneThingYouDidWell}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Takeaways: the main event */}
      <SectionTitle text={`${takeaways.length} Fixes To Lower Your Handicap`} />
      {takeaways.map((t, i) => {
        const tone = priorityTone(t.priority);
        return (
          <View key={i} style={styles.takeawayFrame}>
            <View style={styles.takeawayCard}>
              <View style={styles.takeawayHeader}>
                <View style={[styles.takeawayNum, { borderColor: tone }]}>
                  <Text style={[styles.takeawayNumText, { color: tone }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.priorityRow}>
                    <View style={[styles.priorityPill, { borderColor: tone }]}>
                      <Text style={[styles.priorityPillText, { color: tone }]}>
                        {String(t.priority || 'Medium').toUpperCase()} PRIORITY
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.takeawayTitle}>{t.title}</Text>
                </View>
              </View>

              <Block label="WHAT'S WRONG" body={t.whatToFix} accent={colors.gold} />
              <Block label="WHY IT'S COSTING YOU STROKES" body={t.whyItMatters} accent={colors.danger} />
              <Block label="HOW TO FIX IT" body={t.howToFix} accent={colors.fairwayHi} />

              <View style={styles.metaRow}>
                <MetaChip icon="⏱" label="DO IT" text={t.reps} />
                <MetaChip
                  icon="📉"
                  label="HANDICAP IMPACT"
                  text={t.estimatedHandicapImpact}
                  tone="gold"
                />
              </View>
            </View>
          </View>
        );
      })}

      {/* Ball flight */}
      <SectionTitle text="Ball Flight Forecast" />
      <View style={styles.panel}>
        <Text style={styles.paragraph}>{report.ballFlightExplanation}</Text>
      </View>

      {/* Frame breakdown */}
      <SectionTitle text="Swing Path · Frame By Frame" />
      <View style={styles.panel}>
        {report.frameBreakdown?.map((fb, i) => {
          const frame = frames.find((f) => f.label === fb.label) || frames[i];
          const isOpen = openFrame === i;
          const isLast = i === report.frameBreakdown.length - 1;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.frameRow, isLast && { borderBottomWidth: 0 }]}
              activeOpacity={0.85}
              onPress={() => toggleFrame(i)}
            >
              <View style={styles.frameRowTop}>
                {frame?.uri ? (
                  <Image source={{ uri: frame.uri }} style={styles.frameThumb} />
                ) : (
                  <View style={[styles.frameThumb, styles.frameThumbEmpty]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.frameTag}>F{i + 1}</Text>
                  <Text style={styles.frameTitle} numberOfLines={1}>
                    {fb.label}
                  </Text>
                  <Text style={styles.frameWhat} numberOfLines={isOpen ? 0 : 2}>
                    {fb.whatISee}
                  </Text>
                </View>
                <Text style={[styles.chev, isOpen && { color: colors.fairwayHi }]}>
                  {isOpen ? '▾' : '▸'}
                </Text>
              </View>
              {isOpen && (
                <View style={styles.tipBox}>
                  <Text style={styles.tipLabel}>► COACH TIP</Text>
                  <Text style={styles.tipText}>{fb.tip}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {report.nextVideoTip && (
        <View style={styles.nextTipFrame}>
          <View style={styles.nextTipCard}>
            <Text style={styles.nextTipLabel}>📡  TIP FOR YOUR NEXT VIDEO</Text>
            <Text style={styles.nextTipText}>{report.nextVideoTip}</Text>
          </View>
        </View>
      )}

      <GameButton
        icon="↻"
        label="Analyze Another Swing"
        caption="Run it back"
        onPress={() => navigation.popToTop()}
      />
    </ScrollView>
  );
}

function SectionTitle({ text }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionLabel}>{text}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function Block({ label, body, accent }) {
  return (
    <View style={[styles.block, { borderLeftColor: accent }]}>
      <Text style={[styles.blockLabel, { color: accent }]}>► {label}</Text>
      <Text style={styles.blockBody}>{body}</Text>
    </View>
  );
}

function MetaChip({ icon, label, text, tone = 'green' }) {
  const c =
    tone === 'gold'
      ? { bg: '#1A1300', border: colors.goldDeep, label: colors.gold }
      : { bg: '#0A2418', border: colors.fairwayDeep, label: colors.fairwayHi };
  return (
    <View style={[styles.metaChip, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.metaChipLabel, { color: c.label }]}>
        {icon}  {label}
      </Text>
      <Text style={styles.metaChipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  cardFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 2,
    backgroundColor: '#02080A',
    marginBottom: 18,
  },
  headerCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  handle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginVertical: 6,
  },
  summary: {
    color: colors.silver,
    fontSize: 14,
    lineHeight: 20,
  },
  goodBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(11,191,77,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: colors.fairwayHi,
  },
  goodLabel: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  goodText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 18,
  },

  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.panelBorder,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginHorizontal: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    flexShrink: 1,
  },

  takeawayFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 2,
    backgroundColor: '#02080A',
    marginBottom: 14,
  },
  takeawayCard: {
    backgroundColor: colors.panel,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  takeawayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  takeawayNum: {
    width: 46,
    height: 46,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#02080A',
  },
  takeawayNumText: {
    fontWeight: '900',
    fontStyle: 'italic',
    fontSize: 18,
  },
  priorityRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  priorityPill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  takeawayTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    textTransform: 'uppercase',
    lineHeight: 22,
  },

  block: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  blockBody: {
    color: colors.silver,
    fontSize: 13,
    lineHeight: 19,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  metaChip: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    padding: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  metaChipLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  metaChipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.silver,
  },

  frameRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  frameRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frameThumb: {
    width: 50,
    height: 70,
    backgroundColor: '#000',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  frameThumbEmpty: {
    backgroundColor: colors.sand,
  },
  frameTag: {
    color: colors.gold,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '900',
  },
  frameTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginVertical: 2,
  },
  frameWhat: {
    fontSize: 12,
    color: colors.silver,
    lineHeight: 17,
  },
  chev: {
    fontSize: 18,
    color: colors.silverDim,
    marginLeft: 8,
    fontWeight: '900',
  },
  tipBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(11,191,77,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: colors.fairwayHi,
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.fairwayHi,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: colors.white,
    lineHeight: 18,
  },

  nextTipFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 2,
    backgroundColor: '#02080A',
    marginVertical: 10,
  },
  nextTipCard: {
    backgroundColor: '#1A1300',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.goldDeep,
  },
  nextTipLabel: {
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 2.5,
    fontSize: 10,
    marginBottom: 4,
  },
  nextTipText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
});
