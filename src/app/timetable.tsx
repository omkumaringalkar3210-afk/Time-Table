import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackgroundOrbs } from '@/components/BackgroundOrbs';
import { TimetableSlotCard } from '@/components/TimetableSlotCard';
import { GlassCard } from '@/components/GlassCard';
import { TimetableService } from '@/services/timetable-service';
import {
  getCurrentUser,
  logoutUser,
  UserAccount,
} from '@/storage/preferences-storage';
import { TimetableEntry } from '@/data/timetable-data';
import { GlassColors, GlassShadows } from '@/theme/glass-theme';
import { syncWidgets } from '@/widgets/widget-sync';
import { EditSlotModal } from '@/components/EditSlotModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  buildScheduleKey,
  saveSlotEdit,
  addCustomSlot,
  deleteCustomSlot,
  revertSingleSlot,
  revertAllCustomOverrides,
  hasCustomOverrides,
  isSlotModified,
} from '@/services/custom-timetable-service';

const DAYS = [
  { num: 1, code: 'MON', label: 'Monday' },
  { num: 2, code: 'TUE', label: 'Tuesday' },
  { num: 3, code: 'WED', label: 'Wednesday' },
  { num: 4, code: 'THU', label: 'Thursday' },
  { num: 5, code: 'FRI', label: 'Friday' },
  { num: 6, code: 'SAT', label: 'Saturday' },
  { num: 0, code: 'SUN', label: 'Sunday' },
];

export default function TimetableDashboardScreen() {
  const router = useRouter();

  const [user, setUser] = useState<UserAccount | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    return new Date().getDay();
  });

  const [lectures, setLectures] = useState<TimetableEntry[]>([]);
  const [defaultLectures, setDefaultLectures] = useState<TimetableEntry[]>([]);
  const [hasEdits, setHasEdits] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [isAddingNewSlot, setIsAddingNewSlot] = useState(false);
  const [showUndoAllConfirm, setShowUndoAllConfirm] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const scheduleKey = user
    ? buildScheduleKey(user.username, user.branchId, user.divisionId, user.subdivisionId)
    : '';

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  const refreshSchedule = (currentUser: UserAccount | null = user, currentDay: number = selectedDay) => {
    if (!currentUser) return;
    const key = buildScheduleKey(
      currentUser.username,
      currentUser.branchId,
      currentUser.divisionId,
      currentUser.subdivisionId
    );
    const activeSlots = TimetableService.getDayLectures(
      currentUser.branchId,
      currentUser.divisionId,
      currentUser.subdivisionId,
      currentDay,
      currentUser.username
    );
    const baseSlots = TimetableService.getDefaultDayLectures(
      currentUser.branchId,
      currentUser.divisionId,
      currentUser.subdivisionId,
      currentDay
    );
    setLectures(activeSlots);
    setDefaultLectures(baseSlots);
    setHasEdits(hasCustomOverrides(key));
  };

  // Real-time clock tick every 30s to update LIVE NOW badges & widgets
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      syncWidgets();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load active user
  useEffect(() => {
    (async () => {
      const stored = await getCurrentUser();
      if (!stored || !stored.branchId || !stored.divisionId || !stored.subdivisionId) {
        router.replace('/setup');
        return;
      }
      setUser(stored);
      refreshSchedule(stored, selectedDay);
      syncWidgets();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    })();
  }, []);

  // Load lectures whenever day or user changes
  useEffect(() => {
    if (user) {
      refreshSchedule(user, selectedDay);
    }
  }, [user, selectedDay]);

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentTime(new Date());
    syncWidgets();
    if (user) {
      refreshSchedule(user, selectedDay);
    }
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleSaveSlot = async (updatedSlot: TimetableEntry) => {
    if (!user) return;
    if (isAddingNewSlot) {
      await addCustomSlot(scheduleKey, selectedDay, updatedSlot, defaultLectures);
      showToast('New class added to timetable!');
    } else if (editingSlotIndex !== null) {
      await saveSlotEdit(scheduleKey, selectedDay, editingSlotIndex, updatedSlot, defaultLectures);
      showToast('Class updated successfully!');
    }
    setEditingSlotIndex(null);
    setIsAddingNewSlot(false);
    refreshSchedule();
    syncWidgets();
  };

  const handleRevertSingleSlot = async () => {
    if (!user || editingSlotIndex === null) return;
    await revertSingleSlot(scheduleKey, selectedDay, editingSlotIndex, defaultLectures);
    setEditingSlotIndex(null);
    refreshSchedule();
    syncWidgets();
    showToast('Class reset to default college timetable.');
  };

  const handleDeleteSlot = async () => {
    if (!user || editingSlotIndex === null) return;
    await deleteCustomSlot(scheduleKey, selectedDay, editingSlotIndex, defaultLectures);
    setEditingSlotIndex(null);
    refreshSchedule();
    syncWidgets();
    showToast('Class removed from schedule.');
  };

  const handleUndoAllChanges = async () => {
    setShowUndoAllConfirm(false);
    if (!user) return;
    await revertAllCustomOverrides(scheduleKey);
    refreshSchedule();
    syncWidgets();
    showToast('All changes undone! Default timetable restored.');
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/setup');
  };

  const getGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'GOOD MORNING';
    if (hours < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const isTodaySelected = selectedDay === currentTime.getDay();

  // Count stats
  const totalClasses = lectures.length;
  const completedClasses = lectures.filter(
    (s) => isTodaySelected && TimetableService.getSlotStatus(s, currentTime) === 'ended'
  ).length;
  const upcomingClasses = totalClasses - completedClasses;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackgroundOrbs />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GlassColors.cyan}
            colors={[GlassColors.cyan]}
          />
        }
      >
        <Animated.View style={[styles.mainWrapper, { opacity: fadeAnim }]}>
          {/* ── TOP HEADER: GREETING & LOGOUT BUTTON ────────────────────── */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text numberOfLines={1} style={styles.username}>
                {user?.username ? user.username.toUpperCase() : 'STUDENT'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={handleLogout}
                hitSlop={8}
                style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="log-out-outline" size={14} color="#FF8A80" />
                <Text style={styles.logoutText}>LOG OUT</Text>
              </Pressable>
            </View>
          </View>

          {/* ── CLASS INFO PILL WITH CHANGE BATCH BUTTON ──────────────── */}
          <GlassCard style={styles.classInfoCard}>
            <View style={styles.classInfoLeft}>
              <View style={styles.branchIcon}>
                <Ionicons name="school" size={20} color={GlassColors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.branchCode}>
                  {user?.branchCode || user?.branchId} • {user?.divisionLabel}
                </Text>
                <Text numberOfLines={1} style={styles.batchLabel}>
                  Batch {user?.subdivisionLabel} • {user?.branchLabel}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/setup')}
              style={({ pressed }) => [styles.changeClassBtn, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name="options-outline" size={14} color={GlassColors.cyan} />
              <Text style={styles.changeClassText}>CHANGE</Text>
            </Pressable>
          </GlassCard>

          {/* ── CUSTOM TIMETABLE BANNER WITH UNDO ALL BUTTON ────────── */}
          {hasEdits && (
            <View style={styles.customBanner}>
              <View style={styles.customBannerLeft}>
                <View style={styles.customDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customBannerTitle}>CUSTOM TIMETABLE ACTIVE</Text>
                  <Text style={styles.customBannerSub}>Personal changes applied to your sessions</Text>
                </View>
              </View>

              <Pressable
                onPress={() => setShowUndoAllConfirm(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.undoAllBtn, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="arrow-undo-outline" size={13} color="#FBBF24" />
                <Text style={styles.undoAllBtnText}>UNDO ALL</Text>
              </Pressable>
            </View>
          )}

          {/* ── TODAY'S STATS ROW ─────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalClasses}</Text>
              <Text style={styles.statTitle}>TOTAL SESSIONS</Text>
            </View>

            <View style={[styles.statCard, styles.statCardActive]}>
              <Text style={[styles.statNumber, { color: GlassColors.cyan }]}>
                {isTodaySelected ? upcomingClasses : totalClasses}
              </Text>
              <Text style={styles.statTitle}>
                {isTodaySelected ? 'REMAINING' : 'SCHEDULED'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: GlassColors.emerald }]}>
                {isTodaySelected ? completedClasses : 0}
              </Text>
              <Text style={styles.statTitle}>COMPLETED</Text>
            </View>
          </View>

          {/* ── HORIZONTAL DAY SWITCHER (MON - SUN) ────────────────────── */}
          <View style={styles.daySelectorArea}>
            <Text style={styles.sectionHeading}>SELECT DAY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTrack}
            >
              {DAYS.map((d) => {
                const isSelected = selectedDay === d.num;
                const isToday = currentTime.getDay() === d.num;

                return (
                  <Pressable
                    key={d.num}
                    onPress={() => setSelectedDay(d.num)}
                    style={[
                      styles.dayPill,
                      isSelected && styles.dayPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCode,
                        isSelected && styles.dayCodeSelected,
                      ]}
                    >
                      {d.code}
                    </Text>
                    {isToday && (
                      <View
                        style={[
                          styles.todayDot,
                          isSelected && { backgroundColor: GlassColors.cyan },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── LECTURES / SESSIONS LIST ──────────────────────────────── */}
          <View style={styles.lecturesSection}>
            <View style={styles.lectureHeaderRow}>
              <View>
                <Text style={styles.dayTitle}>
                  {DAYS.find((d) => d.num === selectedDay)?.label.toUpperCase()} SCHEDULE
                </Text>
                <Text style={styles.lectureCount}>
                  {selectedDay === 0 ? 'Holiday' : `${lectures.length} ${lectures.length === 1 ? 'class' : 'classes'}`}
                </Text>
              </View>

              {/* Add Class Button in Header */}
              {selectedDay !== 0 && (
                <Pressable
                  onPress={() => {
                    setEditingSlotIndex(null);
                    setIsAddingNewSlot(true);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [styles.headerAddBtn, pressed && { opacity: 0.75 }]}
                >
                  <Ionicons name="add-circle-outline" size={15} color={GlassColors.cyan} />
                  <Text style={styles.headerAddBtnText}>ADD CLASS</Text>
                </Pressable>
              )}
            </View>

            {selectedDay === 0 ? (
              <GlassCard style={styles.holidayCard}>
                <View style={styles.holidayBadge}>
                  <Ionicons name="sparkles" size={32} color="#FFD166" />
                </View>
                <Text style={styles.holidayTitle}>Sunday • Weekend Holiday 🎉</Text>
                <Text style={styles.holidaySub}>
                  No classes scheduled today. Take time to relax, recharge, and prepare for the upcoming week!
                </Text>
              </GlassCard>
            ) : lectures.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="sunny-outline" size={44} color={GlassColors.cyan} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
                <Text style={styles.emptySub}>
                  Enjoy your free day or work on practical project assignments.
                </Text>
              </GlassCard>
            ) : (
              lectures.map((slot, index) => {
                const status = isTodaySelected
                  ? TimetableService.getSlotStatus(slot, currentTime)
                  : 'upcoming';
                const isEdited = isSlotModified(slot, defaultLectures[index]);

                return (
                  <TimetableSlotCard
                    key={`${slot.subject}_${slot.startTime}_${index}`}
                    slot={slot}
                    status={status}
                    isEdited={isEdited}
                    onEdit={() => {
                      setIsAddingNewSlot(false);
                      setEditingSlotIndex(index);
                    }}
                  />
                );
              })
            )}

            {/* Bottom Add Class button for convenience */}
            {selectedDay !== 0 && lectures.length > 0 && (
              <Pressable
                onPress={() => {
                  setEditingSlotIndex(null);
                  setIsAddingNewSlot(true);
                }}
                style={({ pressed }) => [styles.bottomAddBtn, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="add" size={17} color={GlassColors.cyan} />
                <Text style={styles.bottomAddBtnText}>Add Another Session To This Day</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── FLOATING FEEDBACK TOAST ── */}
      {feedbackToast && (
        <View style={styles.toastWrap}>
          <Ionicons name="checkmark-circle" size={18} color={GlassColors.cyan} />
          <Text style={styles.toastText}>{feedbackToast}</Text>
        </View>
      )}

      {/* ── EDIT / ADD SLOT MODAL ── */}
      <EditSlotModal
        visible={editingSlotIndex !== null || isAddingNewSlot}
        dayLabel={DAYS.find((d) => d.num === selectedDay)?.label || ''}
        slotIndex={editingSlotIndex !== null ? editingSlotIndex : lectures.length}
        initialSlot={editingSlotIndex !== null ? lectures[editingSlotIndex] : null}
        defaultSlot={editingSlotIndex !== null ? defaultLectures[editingSlotIndex] : undefined}
        isNewSlot={isAddingNewSlot}
        onSave={handleSaveSlot}
        onRevert={
          editingSlotIndex !== null &&
          isSlotModified(lectures[editingSlotIndex], defaultLectures[editingSlotIndex])
            ? handleRevertSingleSlot
            : undefined
        }
        onDelete={
          editingSlotIndex !== null && editingSlotIndex >= defaultLectures.length
            ? handleDeleteSlot
            : undefined
        }
        onClose={() => {
          setEditingSlotIndex(null);
          setIsAddingNewSlot(false);
        }}
      />

      {/* ── CONFIRM UNDO ALL CHANGES MODAL ── */}
      <ConfirmModal
        visible={showUndoAllConfirm}
        title="Undo All Changes?"
        message="Are you sure you want to revert all your custom changes? This will restore the official college timetable for all days."
        confirmLabel="Yes, Undo All"
        cancelLabel="Keep Changes"
        confirmVariant="danger"
        iconName="arrow-undo-outline"
        onConfirm={handleUndoAllChanges}
        onCancel={() => setShowUndoAllConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: GlassColors.bgDark,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  mainWrapper: {
    width: '100%',
    maxWidth: 540,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 2.5,
  },
  username: {
    fontSize: 22,
    fontWeight: '900',
    color: GlassColors.textPrimary,
    letterSpacing: 1,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF8A80',
    letterSpacing: 0.5,
  },
  classInfoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 16,
    width: '100%',
  },
  classInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  branchIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchCode: {
    fontSize: 15,
    fontWeight: '800',
    color: GlassColors.textPrimary,
    letterSpacing: 0.5,
  },
  batchLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GlassColors.textMuted,
    marginTop: 2,
  },
  changeClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: GlassColors.cyan,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeClassText: {
    fontSize: 10,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statCardActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: GlassColors.textPrimary,
  },
  statTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: GlassColors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  daySelectorArea: {
    marginBottom: 20,
    width: '100%',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 2,
    marginBottom: 10,
  },
  dayTrack: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  dayPill: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(10, 16, 32, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  dayPillSelected: {
    borderColor: GlassColors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 16px rgba(0, 229, 255, 0.65)',
      } as any,
    }),
  },
  dayCode: {
    fontSize: 13,
    fontWeight: '800',
    color: GlassColors.textMuted,
    letterSpacing: 0.5,
  },
  dayCodeSelected: {
    color: GlassColors.cyan,
    fontWeight: '900',
  },
  todayDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  lecturesSection: {
    marginTop: 4,
    width: '100%',
  },
  lectureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: GlassColors.textPrimary,
    letterSpacing: 1.5,
  },
  lectureCount: {
    fontSize: 12,
    fontWeight: '700',
    color: GlassColors.textMuted,
  },
  holidayCard: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 20,
    marginTop: 10,
    width: '100%',
    backgroundColor: 'rgba(255, 209, 102, 0.05)',
    borderColor: 'rgba(255, 209, 102, 0.25)',
  },
  holidayBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 209, 102, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  holidayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD166',
    marginBottom: 8,
    textAlign: 'center',
  },
  holidaySub: {
    fontSize: 13,
    color: GlassColors.textMuted,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 10,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: GlassColors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: GlassColors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  customBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    width: '100%',
  },
  customBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  customDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
    marginRight: 10,
  },
  customBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.8,
  },
  customBannerSub: {
    fontSize: 11,
    color: GlassColors.textSecondary,
    marginTop: 2,
  },
  undoAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  undoAllBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerAddBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.6,
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 229, 255, 0.35)',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
    width: '100%',
  },
  bottomAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.cyan,
    letterSpacing: 0.4,
  },
  toastWrap: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A1329',
    borderWidth: 1.5,
    borderColor: GlassColors.cyan,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 229, 255, 0.3)',
      } as any,
      default: GlassShadows.cardSoft,
    }),
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
});
