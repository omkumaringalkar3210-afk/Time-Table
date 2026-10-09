import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GlassColors } from '@/theme/glass-theme';

interface CircularProgressProps {
  percentage: number; // -1 for N/A, otherwise 0 - 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  target?: number;
  label?: string;
  sublabel?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 90,
  strokeWidth = 7,
  color = GlassColors.cyan,
  target,
  label,
  sublabel,
}) => {
  const isNA = percentage < 0;
  const clamped = Math.max(0, Math.min(100, isNA ? 0 : percentage));
  const isMeetingTarget = target !== undefined ? clamped >= target : true;
  const activeColor = isNA
    ? GlassColors.textMuted
    : isMeetingTarget
    ? color
    : GlassColors.rose;

  const innerSize = size - strokeWidth * 2;

  // Web-specific conic gradient for smooth ring fill
  const webRingStyle = Platform.OS === 'web' ? {
    background: isNA
      ? 'rgba(255, 255, 255, 0.08)'
      : `conic-gradient(${activeColor} 0deg ${clamped * 3.6}deg, rgba(255, 255, 255, 0.08) ${clamped * 3.6}deg 360deg)`,
  } as any : {};

  return (
    <View style={[styles.container, { width: size, alignItems: 'center' }]}>
      <View
        style={[
          styles.outerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderColor: Platform.OS !== 'web' ? (isNA ? 'rgba(255,255,255,0.1)' : activeColor) : 'transparent',
            borderWidth: Platform.OS !== 'web' ? 2 : 0,
          },
          webRingStyle,
        ]}
      >
        {/* Inner cutout to form ring */}
        <View
          style={[
            styles.innerCircle,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: GlassColors.bgDark,
            },
          ]}
        >
          <Text style={[styles.percentText, { color: activeColor }]}>
            {isNA ? 'N/A' : `${Math.round(clamped)}%`}
          </Text>
          {target !== undefined && (
            <Text style={styles.targetBadge}>
              🎯 {target}%
            </Text>
          )}
        </View>
      </View>

      {label && <Text style={styles.label} numberOfLines={1}>{label}</Text>}
      {sublabel && <Text style={styles.sublabel} numberOfLines={1}>{sublabel}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
  },
  outerRing: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  innerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  percentText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  targetBadge: {
    fontSize: 9,
    color: GlassColors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: GlassColors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: 10,
    color: GlassColors.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
});
