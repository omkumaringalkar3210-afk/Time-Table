import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimetableEntry } from '@/data/timetable-data';
import { GlassColors, GlassShadows } from '@/theme/glass-theme';

interface TimetableSlotCardProps {
  slot: TimetableEntry;
  status: 'ongoing' | 'upcoming' | 'ended';
  isEdited?: boolean;
  onEdit?: () => void;
}

export function TimetableSlotCard({
  slot,
  status,
  isEdited = false,
  onEdit,
}: TimetableSlotCardProps) {
  const isOngoing = status === 'ongoing';
  const isEnded = status === 'ended';

  const getTypeMeta = () => {
    switch (slot.type) {
      case 'lab':
        return { label: 'LAB', color: GlassColors.emerald, bg: GlassColors.emeraldDim, icon: 'flask-outline' };
      case 'tutorial':
        return { label: 'TUTORIAL', color: GlassColors.amber, bg: GlassColors.amberDim, icon: 'pencil-outline' };
      case 'doubt':
        return { label: 'DOUBT SESSION', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', icon: 'help-circle-outline' };
      default:
        return { label: 'LECTURE', color: GlassColors.cyan, bg: GlassColors.cyanDim, icon: 'book-outline' };
    }
  };

  const typeMeta = getTypeMeta();
  const isDoubt = slot.type === 'doubt';
  const activeColor = isDoubt ? '#c084fc' : GlassColors.cyan;

  return (
    <View
      style={[
        styles.card,
        isDoubt && styles.cardDoubt,
        isEdited && styles.cardEdited,
        isOngoing && (isDoubt ? styles.cardDoubtOngoing : styles.cardOngoing),
        isEnded && styles.cardEnded,
      ]}
    >
      {/* Top row: Time + Badges + Edit Button */}
      <View style={styles.topRow}>
        <View style={styles.timeWrap}>
          <Ionicons
            name="time-outline"
            size={14}
            color={isOngoing ? activeColor : GlassColors.textSecondary}
          />
          <Text style={[styles.timeText, isOngoing && { color: activeColor, fontWeight: '800' }]}>
            {slot.startTime} — {slot.endTime}
          </Text>
        </View>

        <View style={styles.badgeRow}>
          {isOngoing && (
            <View style={[styles.liveBadge, { backgroundColor: `${activeColor}28`, borderColor: activeColor }]}>
              <View style={[styles.livePulseDot, { backgroundColor: activeColor }]} />
              <Text style={[styles.liveBadgeText, { color: activeColor }]}>LIVE NOW</Text>
            </View>
          )}

          {isEdited && (
            <View style={styles.editedBadge}>
              <Ionicons name="pencil" size={9} color="#FBBF24" style={{ marginRight: 3 }} />
              <Text style={styles.editedBadgeText}>EDITED</Text>
            </View>
          )}

          <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg, borderColor: `${typeMeta.color}50` }]}>
            <Ionicons name={typeMeta.icon as any} size={11} color={typeMeta.color} style={{ marginRight: 4 }} />
            <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>

          {onEdit && (
            <Pressable
              onPress={onEdit}
              hitSlop={8}
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.65 }]}
            >
              <Ionicons name="create-outline" size={12} color={GlassColors.cyan} />
              <Text style={styles.editBtnText}>EDIT</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Subject Title */}
      <Text style={[
        styles.subjectTitle,
        isEnded && styles.subjectEnded,
        slot.type === 'doubt' && styles.subjectDoubt,
      ]} numberOfLines={2}>
        {slot.subject}
      </Text>

      {/* Original subject shown for doubt sessions */}
      {slot.type === 'doubt' && slot.originalSubject ? (
        <Text style={styles.originalSubjectText} numberOfLines={1}>
          Substitutes: {slot.originalSubject}
        </Text>
      ) : null}

      {slot.subjectCode ? (
        <Text style={styles.subjectCode}>{slot.subjectCode}</Text>
      ) : null}

      {/* Meta Row: Room + Teacher */}
      <View style={styles.metaRow}>
        {slot.room && slot.room !== '-' && (
          <View style={styles.metaChip}>
            <Ionicons
              name="location-outline"
              size={13}
              color={isOngoing ? GlassColors.cyan : GlassColors.textMuted}
            />
            <Text style={[styles.metaText, isOngoing && { color: GlassColors.cyan }]}>
              Room: {slot.room}
            </Text>
          </View>
        )}

        {slot.teacher && slot.teacher !== '-' && (
          <View style={styles.metaChip}>
            <Ionicons
              name="person-outline"
              size={13}
              color={isOngoing ? GlassColors.cyan : GlassColors.textMuted}
            />
            <Text style={[styles.metaText, isOngoing && { color: GlassColors.cyan }]} numberOfLines={1}>
              {slot.teacher}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GlassColors.bgCard,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      } as any,
      default: GlassShadows.cardSoft,
    }),
  },
  cardDoubt: {
    borderColor: 'rgba(192, 132, 252, 0.25)',
    backgroundColor: 'rgba(192, 132, 252, 0.04)',
  },
  cardEdited: {
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderLeftWidth: 3.5,
    borderLeftColor: '#FBBF24',
  },
  cardDoubtOngoing: {
    borderColor: '#c084fc',
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 28px rgba(192, 132, 252, 0.35), inset 0 0 14px rgba(192, 132, 252, 0.08)',
      } as any,
      default: {
        shadowColor: '#c084fc',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  cardOngoing: {
    borderColor: GlassColors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 28px rgba(0, 229, 255, 0.38), inset 0 0 14px rgba(0, 229, 255, 0.1)',
      } as any,
      default: GlassShadows.cyanGlow,
    }),
  },
  cardEnded: {
    opacity: 0.55,
    backgroundColor: 'rgba(7, 12, 26, 0.5)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.textSecondary,
    letterSpacing: 0.5,
  },
  timeOngoing: {
    color: GlassColors.cyan,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    borderColor: GlassColors.cyan,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GlassColors.cyan,
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: GlassColors.cyan,
    letterSpacing: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.6)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editedBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 3,
  },
  editBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.8,
  },
  subjectTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: GlassColors.textPrimary,
    lineHeight: 23,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subjectEnded: {
    color: GlassColors.textMuted,
  },
  subjectDoubt: {
    color: '#c084fc',
  },
  originalSubjectText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(192, 132, 252, 0.6)',
    letterSpacing: 0.4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  subjectCode: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0, 229, 255, 0.75)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '85%',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: GlassColors.textSecondary,
  },
});
