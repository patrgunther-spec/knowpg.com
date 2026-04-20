import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';

export default function ResultsScreen({ route, navigation }) {
  const { report, frames } = route.params;
  const [openFrame, setOpenFrame] = useState(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Here's what Coach saw</Text>
        <Text style={styles.heroSummary}>{report.summary}</Text>

        <View style={styles.goodBox}>
          <Text style={styles.goodLabel}>⭐ One thing you did well</Text>
          <Text style={styles.goodText}>{report.oneThingYouDidWell}</Text>
        </View>
      </View>

      <SectionTitle emoji="🏌️" text="Your Swing, Moment by Moment" />
      <View style={styles.card}>
        {report.frameBreakdown?.map((fb, i) => {
          const frame = frames.find((f) => f.label === fb.label) || frames[i];
          const isOpen = openFrame === i;
          return (
            <TouchableOpacity
              key={i}
              style={styles.frameRow}
              activeOpacity={0.8}
              onPress={() => setOpenFrame(isOpen ? null : i)}
            >
              <View style={styles.frameRowTop}>
                {frame?.uri ? (
                  <Image source={{ uri: frame.uri }} style={styles.frameThumb} />
                ) : (
                  <View style={[styles.frameThumb, styles.frameThumbEmpty]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.frameTitle}>{fb.label}</Text>
                  <Text style={styles.frameWhat} numberOfLines={isOpen ? 0 : 2}>
                    {fb.whatISee}
                  </Text>
                </View>
                <Text style={styles.chev}>{isOpen ? '▾' : '▸'}</Text>
              </View>
              {isOpen && (
                <View style={styles.tipBox}>
                  <Text style={styles.tipLabel}>💡 Try this:</Text>
                  <Text style={styles.tipText}>{fb.tip}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionTitle emoji="🎯" text="Why The Ball Goes That Way" />
      <View style={styles.card}>
        <Text style={styles.paragraph}>{report.ballFlightExplanation}</Text>
      </View>

      <SectionTitle emoji="🔧" text="Biggest Things To Fix" />
      <View style={styles.card}>
        {report.biggestIssues?.map((issue, i) => (
          <View key={i} style={styles.issueRow}>
            <View style={styles.issueBadge}>
              <Text style={styles.issueBadgeText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.issueName}>{issue.name}</Text>
              <Text style={styles.issueWhy}>
                <Text style={styles.issueLabel}>Why: </Text>
                {issue.why}
              </Text>
              <Text style={styles.issueWhy}>
                <Text style={styles.issueLabel}>What it does: </Text>
                {issue.howItHurts}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <SectionTitle emoji="🏃" text="Drills To Make You Better" />
      {report.drills?.map((drill, i) => (
        <View key={i} style={[styles.card, styles.drillCard]}>
          <View style={styles.drillHeader}>
            <View style={styles.drillNum}>
              <Text style={styles.drillNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.drillName}>{drill.name}</Text>
          </View>
          <Text style={styles.drillLabel}>How to do it</Text>
          <Text style={styles.drillText}>{drill.howToDo}</Text>
          <Text style={styles.drillLabel}>Why it helps</Text>
          <Text style={styles.drillText}>{drill.whyItHelps}</Text>
          <View style={styles.repsPill}>
            <Text style={styles.repsText}>🔁 {drill.reps}</Text>
          </View>
        </View>
      ))}

      {report.nextVideoTip && (
        <View style={[styles.card, styles.nextTipCard]}>
          <Text style={styles.nextTipLabel}>📸 For your next video</Text>
          <Text style={styles.nextTipText}>{report.nextVideoTip}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.primaryBtnText}>Try Another Swing</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionTitle({ emoji, text }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={styles.sectionTitle}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.fairway,
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSummary: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
  },
  goodBox: {
    backgroundColor: colors.fairwayDark,
    padding: 12,
    borderRadius: 12,
  },
  goodLabel: {
    color: colors.sun,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  goodText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  frameRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  frameRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frameThumb: {
    width: 54,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.sand,
    marginRight: 10,
  },
  frameThumbEmpty: {
    backgroundColor: colors.sand,
  },
  frameTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  frameWhat: {
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  chev: {
    fontSize: 18,
    color: colors.inkSoft,
    marginLeft: 8,
  },
  tipBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.fairwayLight,
    borderRadius: 10,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.fairway,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  issueRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  issueBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  issueBadgeText: {
    color: colors.white,
    fontWeight: '800',
  },
  issueName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  issueLabel: {
    fontWeight: '700',
    color: colors.fairway,
  },
  issueWhy: {
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 19,
    marginBottom: 2,
  },
  drillCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.sun,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drillNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  drillNumText: {
    fontWeight: '800',
    color: colors.ink,
  },
  drillName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  drillLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.fairway,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  drillText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  repsPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.fairwayLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  repsText: {
    color: colors.fairway,
    fontWeight: '700',
    fontSize: 13,
  },
  nextTipCard: {
    backgroundColor: colors.sand,
    borderColor: colors.sun,
  },
  nextTipLabel: {
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  nextTipText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: colors.fairway,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
});
