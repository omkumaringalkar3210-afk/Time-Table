import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassColors, GlassShadows } from '@/theme/glass-theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  iconName?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  iconName = 'alert-circle-outline',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          bounciness: 6,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const isDanger = confirmVariant === 'danger';
  const iconColor = isDanger ? '#FF5252' : GlassColors.cyan;
  const confirmBtnBg = isDanger ? 'rgba(255, 82, 82, 0.22)' : 'rgba(0, 229, 255, 0.2)';
  const confirmBorder = isDanger ? '#FF5252' : GlassColors.cyan;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropBg, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        </Animated.View>

        <Animated.View
          style={[
            styles.dialogCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Icon Badge */}
          <View style={[styles.iconWrap, { borderColor: `${iconColor}55`, backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: confirmBtnBg, borderColor: confirmBorder },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.confirmText, { color: iconColor }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdropBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0A1226',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 255, 0.15)',
      } as any,
      default: GlassShadows.cardSoft,
    }),
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: GlassColors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    color: GlassColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassColors.textSecondary,
    letterSpacing: 0.4,
  },
  confirmBtn: {
    flex: 1.3,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
