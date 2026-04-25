import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function GameButton({
  label,
  caption,
  icon,
  onPress,
  variant = 'primary',
}) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.();
  };
  const palette =
    variant === 'gold'
      ? [colors.gold, colors.goldDeep]
      : variant === 'ghost'
      ? [colors.panel, colors.panelHi]
      : [colors.fairwayHi, colors.fairwayDeep];

  const textColor =
    variant === 'gold' ? '#241A00' : variant === 'ghost' ? colors.silver : colors.white;

  return (
    <TouchableOpacity activeOpacity={0.78} onPress={handlePress} style={styles.wrap}>
      <View
        style={[
          styles.borderFrame,
          variant === 'ghost' && { borderColor: colors.panelBorder },
        ]}
      >
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          <View style={styles.left}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <View>
              <Text style={[styles.label, { color: textColor }]}>{label}</Text>
              {caption ? (
                <Text
                  style={[
                    styles.caption,
                    { color: variant === 'gold' ? '#3A2A00' : 'rgba(255,255,255,0.85)' },
                  ]}
                >
                  {caption}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.chev, { color: textColor }]}>▸</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 6,
  },
  borderFrame: {
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 4,
    padding: 2,
    backgroundColor: '#02080A',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  label: {
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  caption: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
    fontWeight: '700',
  },
  chev: {
    fontSize: 22,
    fontWeight: '900',
  },
});
