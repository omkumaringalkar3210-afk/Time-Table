import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassColors } from '@/theme/glass-theme';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/KGlte8ZxZ64JLy6yF2fmXN';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function Watermark() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Trigger smooth layout animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Subtle press bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    setExpanded(true);

    // Revert back to original size after 2 seconds
    timerRef.current = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleWhatsAppPress = () => {
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        Alert.alert(
          'No Internet',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      Alert.alert(
        'Join Our Community',
        'For upcoming updates and features, join our WhatsApp community!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join Now',
            onPress: () => Linking.openURL(WHATSAPP_COMMUNITY_URL),
          },
        ],
        { cancelable: true }
      );
    });
  };

  const bottomOffset = Platform.OS === 'web' ? 16 : Math.max(16, insets.bottom + 10);

  return (
    <View
      style={[
        styles.floatingContainer,
        { bottom: bottomOffset },
        Platform.OS === 'web' && ({ position: 'fixed', bottom: '16px', right: '14px' } as any),
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handlePress}
          hitSlop={6}
          style={({ pressed }) => [
            styles.badgePill,
            expanded && styles.badgePillExpanded,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.glowDot, expanded && styles.glowDotExpanded]} />
          <Text style={styles.badgeText}>
            made by :{' '}
            <Pressable onPress={handleWhatsAppPress} hitSlop={8}>
              <Text style={[styles.badgeAuthor, expanded && styles.badgeAuthorExpanded]}>
                {expanded ? 'omkumar ingalkar' : 'om'}
              </Text>
            </Pressable>
          </Text>
        </Pressable>
      </Animated.View>
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
        cursor: 'pointer',
        transition: 'all 0.25s ease',
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
  badgePillExpanded: {
    borderColor: GlassColors.cyan,
    backgroundColor: 'rgba(8, 18, 42, 0.98)',
    paddingHorizontal: 14,
    ...Platform.select({
      web: {
        boxShadow: '0 0 24px rgba(0, 229, 255, 0.65), 0 4px 14px rgba(0, 0, 0, 0.7)',
      } as any,
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
  glowDotExpanded: {
    backgroundColor: '#00F5FF',
    ...Platform.select({
      web: {
        boxShadow: '0 0 12px #00F5FF',
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
  badgeAuthorExpanded: {
    color: '#00F5FF',
    letterSpacing: 0.8,
  },
});
