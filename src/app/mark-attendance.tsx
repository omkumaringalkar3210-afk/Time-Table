import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackgroundOrbs } from '@/components/BackgroundOrbs';
import { GlassCard } from '@/components/GlassCard';
import { GlassColors } from '@/theme/glass-theme';
import { getCurrentUser, UserAccount } from '@/storage/preferences-storage';
import { TimetableService } from '@/services/timetable-service';
import { TimetableEntry } from '@/data/timetable-data';
import {
  AttendanceStore,
  AttendanceStatus,
  getAttendanceStore,
  makeSubjectId,
  buildRecordId,
  markAttendance,
} from '@/services/attendance-service';

interface ScheduledSlotItem {
  slot: TimetableEntry;
  subjectId: string;
  isTracked: boolean;
  status: AttendanceStatus;
}

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [store, setStore] = useState<AttendanceStore | null>(null);
  const [slots, setSlots] = useState<ScheduledSlotItem[]>([]);
  const [todayIso, setTodayIso] = useState('');
  const [todayFormatted, setTodayFormatted] = useState('');

  const loadSchedule = useCallback(async () => {
    try {
      const now = new Date();
      const iso = now.toISOString().split('T')[0];
      setTodayIso(iso);

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      setTodayFormatted(`${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}`);

      const user = await getCurrentUser();
      setCurrentUser(user);

      const attStore = await getAttendanceStore();
      setStore(attStore);

      const dayNum = now.getDay();
      if (dayNum === 0) {
        // Sunday
        setSlots([]);
        setLoading(false);
        return;
      }

      if (user && user.branchId && user.divisionId && user.subdivisionId) {
        const rawSlots = TimetableService.getDayLectures(
          user.branchId,
          user.divisionId,
          user.subdivisionId,
          dayNum,
          user.username
        );

        const items: ScheduledSlotItem[] = [];

        for (const slot of rawSlots) {
          if (slot.type === 'break') continue;

          const subjectName = slot.type === 'doubt' && slot.originalSubject
            ? slot.originalSubject
            : slot.subject;
          if (subjectName === 'Doubt Solving Session') continue;

          const classType: 'lecture' | 'lab' = slot.type === 'lab' ? 'lab' : 'lecture';
          const subjectId = makeSubjectId(subjectName, classType);
          const isTracked = attStore.subjects.some((s) => s.id === subjectId && s.isTracked);

          const recordId = buildRecordId(subjectId, iso, slot.startTime);
          const existingRecord = attStore.records.find((r) => r.id === recordId);
          const status: AttendanceStatus = existingRecord ? existingRecord.status : 'not_marked';

          items.push({
            slot,
            subjectId,
            isTracked,
            status,
          });
        }

        setSlots(items);
      }
    } catch (e) {
      console.warn('Failed to load today schedule:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleSetStatus = async (item: ScheduledSlotItem, newStatus: AttendanceStatus) => {
    const finalStatus: AttendanceStatus = item.status === newStatus ? 'not_marked' : newStatus;

    // Optimistic UI update
    setSlots((prev) =>
      prev.map((s) =>
        s.slot.startTime === item.slot.startTime && s.subjectId === item.subjectId
          ? { ...s, status: finalStatus }
          : s
      )
    );

    const now = new Date();
    await markAttendance({
      subjectId: item.subjectId,
      date: todayIso,
      dayNum: now.getDay(),
      slotTime: item.slot.startTime,
      status: finalStatus,
    });
  };

  const markedCount = slots.filter((s) => s.status !== 'not_marked').length;
  const totalCount = slots.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackgroundOrbs />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={GlassColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>{todayFormatted}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GlassColors.cyan} />
          <Text style={styles.loadingText}>Loading today's schedule...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Progress Tracker Card */}
          <GlassCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>
                <Text style={styles.progressTitle}>
                  {markedCount} of {totalCount} classes marked
                </Text>
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {totalCount > 0 ? `${Math.round((markedCount / totalCount) * 100)}%` : '0%'}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: totalCount > 0 ? `${(markedCount / totalCount) * 100}%` : '0%',
                  },
                ]}
              />
            </View>
          </GlassCard>

          {/* Sunday / No classes state */}
          {slots.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="sunny-outline" size={44} color={GlassColors.amber} />
              <Text style={styles.emptyTitle}>No classes scheduled today</Text>
              <Text style={styles.emptySubtitle}>
                Enjoy your holiday! Past attendance can still be edited in the Dashboard.
              </Text>
            </GlassCard>
          ) : (
            slots.map((item, index) => {
              const isLab = item.slot.type === 'lab';
              const subjectName = item.slot.type === 'doubt' && item.slot.originalSubject
                ? item.slot.originalSubject
                : item.slot.subject;

              return (
                <GlassCard
                  key={`${item.slot.startTime}_${index}`}
                  style={[
                    styles.slotCard,
                    item.status === 'present' && styles.slotCardPresent,
                    item.status === 'absent' && styles.slotCardAbsent,
                    item.status === 'cancelled' && styles.slotCardCancelled,
                  ]}
                >
                  {/* Slot Header */}
                  <View style={styles.slotHeader}>
                    <View style={styles.slotTimeBadge}>
                      <Ionicons name="time-outline" size={12} color={GlassColors.cyanBright} />
                      <Text style={styles.slotTimeText}>{item.slot.time}</Text>
                    </View>

                    <View style={[styles.typeBadge, { borderColor: isLab ? GlassColors.purple : GlassColors.cyan }]}>
                      <Text style={[styles.typeBadgeText, { color: isLab ? GlassColors.purple : GlassColors.cyan }]}>
                        {isLab ? 'LAB / PRACTICAL' : 'LECTURE'}
                      </Text>
                    </View>
                  </View>

                  {/* Subject Title */}
                  <Text style={styles.subjectTitle} numberOfLines={2}>
                    {subjectName}
                  </Text>

                  {/* Room & Teacher */}
                  <View style={styles.metaRow}>
                    {item.slot.room && item.slot.room !== '-' && (
                      <View style={styles.metaChip}>
                        <Ionicons name="location-outline" size={12} color={GlassColors.textMuted} />
                        <Text style={styles.metaChipText}>{item.slot.room}</Text>
                      </View>
                    )}
                    {item.slot.teacher && item.slot.teacher !== '-' && (
                      <View style={styles.metaChip}>
                        <Ionicons name="person-outline" size={12} color={GlassColors.textMuted} />
                        <Text style={styles.metaChipText} numberOfLines={1}>
                          {item.slot.teacher}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Attendance Marking Buttons */}
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        item.status === 'present' && styles.presentBtnActive,
                      ]}
                      onPress={() => handleSetStatus(item, 'present')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={item.status === 'present' ? '#060A17' : GlassColors.emerald}
                      />
                      <Text
                        style={[
                          styles.statusBtnText,
                          { color: item.status === 'present' ? '#060A17' : GlassColors.emerald },
                        ]}
                      >
                        Present
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        item.status === 'absent' && styles.absentBtnActive,
                      ]}
                      onPress={() => handleSetStatus(item, 'absent')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={item.status === 'absent' ? '#FFFFFF' : GlassColors.rose}
                      />
                      <Text
                        style={[
                          styles.statusBtnText,
                          { color: item.status === 'absent' ? '#FFFFFF' : GlassColors.rose },
                        ]}
                      >
                        Absent
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        item.status === 'cancelled' && styles.cancelledBtnActive,
                      ]}
                      onPress={() => handleSetStatus(item, 'cancelled')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={18}
                        color={item.status === 'cancelled' ? '#060A17' : GlassColors.amber}
                      />
                      <Text
                        style={[
                          styles.statusBtnText,
                          { color: item.status === 'cancelled' ? '#060A17' : GlassColors.amber },
                        ]}
                      >
                        Cancelled
                      </Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GlassColors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GlassColors.borderMuted,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: GlassColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: GlassColors.cyanBright,
    fontWeight: '600',
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: GlassColors.textSecondary,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  progressCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.8,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GlassColors.textPrimary,
    marginTop: 2,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: GlassColors.cyanBright,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GlassColors.cyan,
    borderRadius: 3,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: GlassColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  slotCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GlassColors.borderLight,
  },
  slotCardPresent: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  slotCardAbsent: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
  },
  slotCardCancelled: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: GlassColors.cyanBright,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GlassColors.textPrimary,
    lineHeight: 21,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    color: GlassColors.textSecondary,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  presentBtnActive: {
    backgroundColor: GlassColors.emerald,
    borderColor: GlassColors.emerald,
  },
  absentBtnActive: {
    backgroundColor: GlassColors.rose,
    borderColor: GlassColors.rose,
  },
  cancelledBtnActive: {
    backgroundColor: GlassColors.amber,
    borderColor: GlassColors.amber,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
