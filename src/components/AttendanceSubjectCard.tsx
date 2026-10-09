import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassColors } from '@/theme/glass-theme';
import { GlassCard } from '@/components/GlassCard';
import { SubjectStats, TrackedSubject } from '@/services/attendance-service';

interface AttendanceSubjectCardProps {
  subject: TrackedSubject;
  stats: SubjectStats;
  onImportPress: () => void;
  onHistoryPress: () => void;
  onSettingsPress?: () => void;
}

export const AttendanceSubjectCard: React.FC<AttendanceSubjectCardProps> = ({
  subject,
  stats,
  onImportPress,
  onHistoryPress,
}) => {
  const isLab = subject.classType === 'lab';
  const typeColor = isLab ? GlassColors.purple : GlassColors.cyan;
  const isNA = stats.percentage < 0;
  const isMeeting = stats.isMeetingTarget;
  const statusColor = isNA
    ? GlassColors.textMuted
    : isMeeting
    ? GlassColors.emerald
    : GlassColors.rose;

  const percentDisplay = isNA ? 'N/A' : `${stats.percentage}%`;
  const progressRatio = isNA || stats.totalConducted === 0 ? 0 : Math.min(1, stats.totalAttended / stats.totalConducted);

  // Status message
  let statusMessage = '';
  if (isNA) {
    statusMessage = 'No classes conducted yet';
  } else if (isMeeting) {
    statusMessage = `On track! Meeting ${stats.target}% target`;
  } else if (stats.classesNeededToReachTarget === -1) {
    statusMessage = '100% target missed — attend all upcoming classes!';
  } else if (stats.classesNeededToReachTarget > 0) {
    statusMessage = `Attend next ${stats.classesNeededToReachTarget} class${stats.classesNeededToReachTarget > 1 ? 'es' : ''} to reach ${stats.target}%`;
  }

  return (
    <GlassCard style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: isLab ? GlassColors.purpleDim : GlassColors.cyanDim, borderColor: typeColor }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {isLab ? 'LAB / PRACTICAL' : 'LECTURE'}
              </Text>
            </View>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>Target: {stats.target}%</Text>
            </View>
            {subject.previousConducted > 0 && (
              <View style={styles.importedBadge}>
                <Text style={styles.importedBadgeText}>Past Data Added</Text>
              </View>
            )}
          </View>
          <Text style={styles.subjectName} numberOfLines={2}>
            {subject.subjectName}
          </Text>
        </View>

        {/* Percentage Box */}
        <View style={[styles.percentBox, { borderColor: statusColor, backgroundColor: 'rgba(6, 10, 23, 0.7)' }]}>
          <Text style={[styles.percentNumber, { color: statusColor }]}>
            {percentDisplay}
          </Text>
          <Text style={[styles.percentLabel, { color: statusColor }]}>
            {isNA ? 'NO DATA' : isMeeting ? 'ON TRACK' : 'SHORT'}
          </Text>
        </View>
      </View>

      {/* Progress Bar with Target Marker */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressRatio * 100}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
          {/* Target marker line */}
          <View
            style={[
              styles.targetMarker,
              { left: `${Math.min(99, stats.target)}%` },
            ]}
          />
        </View>
      </View>

      {/* Status Alert Banner */}
      <View style={[styles.statusAlert, { backgroundColor: isMeeting ? GlassColors.emeraldDim : GlassColors.roseDim }]}>
        <Ionicons
          name={isNA ? 'information-circle-outline' : isMeeting ? 'checkmark-circle' : 'alert-circle'}
          size={14}
          color={statusColor}
        />
        <Text style={[styles.statusAlertText, { color: statusColor }]} numberOfLines={1}>
          {statusMessage}
        </Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CONDUCTED</Text>
          <Text style={styles.metricValue}>{stats.totalConducted}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: GlassColors.emerald }]}>ATTENDED</Text>
          <Text style={[styles.metricValue, { color: GlassColors.emerald }]}>{stats.totalAttended}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: GlassColors.rose }]}>MISSED</Text>
          <Text style={[styles.metricValue, { color: GlassColors.rose }]}>{stats.totalMissed}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onImportPress}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload-outline" size={14} color={GlassColors.cyanBright} />
          <Text style={styles.actionBtnText}>
            {subject.previousConducted > 0 ? 'Edit Past Totals' : '+ Add Past Totals'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.historyBtn]}
          onPress={onHistoryPress}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={14} color={GlassColors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: GlassColors.textSecondary }]}>
            History & Logs
          </Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GlassColors.borderLight,
    backgroundColor: 'rgba(11, 19, 43, 0.75)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  targetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  targetBadgeText: {
    fontSize: 10,
    color: GlassColors.textSecondary,
    fontWeight: '600',
  },
  importedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
  },
  importedBadgeText: {
    fontSize: 9,
    color: GlassColors.cyanBright,
    fontWeight: '700',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: GlassColors.textPrimary,
    lineHeight: 22,
  },
  percentBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 78,
  },
  percentNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    opacity: 0.8,
  },
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusAlertText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: GlassColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: GlassColors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  historyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: GlassColors.cyanBright,
  },
});
