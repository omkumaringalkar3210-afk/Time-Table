import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassColors } from '@/theme/glass-theme';

export function Watermark() {
  const insets = useSafeAreaInsets();
  const bottomOffset = Platform.OS === 'web' ? 16 : Math.max(16, insets.bottom + 10);

  return (
    <View
      style={[
        styles.floatingContainer,
        { bottom: bottomOffset },
        Platform.OS === 'web' && ({ position: 'fixed', bottom: '16px', right: '14px' } as any),
      ]}
      pointerEvents="none"
    >
      <View style={styles.badgePill}>
        <View style={styles.glowDot} />
        <Text style={styles.badgeText}>
          made by : <Text style={styles.badgeAuthor}>om</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 14,
    zIndex: 999999,
    elevation: 999999,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 12, 28, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.45)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 0 18px rgba(0, 229, 255, 0.4), 0 4px 10px rgba(0, 0, 0, 0.6)',
      } as any,
      default: {
        shadowColor: GlassColors.cyan,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  glowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GlassColors.cyan,
    ...Platform.select({
      web: {
        boxShadow: '0 0 8px #00E5FF',
      } as any,
    }),
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
  },
  badgeAuthor: {
    color: GlassColors.cyan,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
