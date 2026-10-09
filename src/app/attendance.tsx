import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackgroundOrbs } from '@/components/BackgroundOrbs';
import { GlassCard } from '@/components/GlassCard';
import { GlassColors } from '@/theme/glass-theme';
import { CircularProgress } from '@/components/CircularProgress';
import { AttendanceSubjectCard } from '@/components/AttendanceSubjectCard';
import { PreviousAttendanceModal } from '@/components/PreviousAttendanceModal';
import { AttendanceHistoryModal } from '@/components/AttendanceHistoryModal';
import { AttendanceSettingsModal } from '@/components/AttendanceSettingsModal';
import { getCurrentUser, UserAccount } from '@/storage/preferences-storage';
import {
  AttendanceStore,
  getAttendanceStore,
  getOverallStats,
  getSubjectStats,
  TrackedSubject,
  SubjectStats,
  OverallStats,
  getTodayPendingCount,
} from '@/services/attendance-service';

export default function AttendanceDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [store, setStore] = useState<AttendanceStore | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [pendingToday, setPendingToday] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Filter: 'all' | 'lecture' | 'lab'
  const [activeTab, setActiveTab] = useState<'all' | 'lecture' | 'lab'>('all');

  // Modal states
  const [selectedSubjectForImport, setSelectedSubjectForImport] = useState<TrackedSubject | null>(null);
  const [selectedSubjectForHistory, setSelectedSubjectForHistory] = useState<TrackedSubject | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const s = await getAttendanceStore();

      // If setup not completed yet, redirect to setup
      if (!s.setupComplete || s.subjects.length === 0) {
        router.replace('/attendance-setup' as any);
        return;
      }

      setStore(s);
      setOverallStats(getOverallStats(s));

      if (user && user.branchId && user.divisionId && user.subdivisionId) {
        const pending = await getTodayPendingCount(
          user.branchId,
          user.divisionId,
          user.subdivisionId,
          user.username
        );
        setPendingToday(pending);
      }
    } catch (e) {
      console.warn('Failed to load attendance dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <BackgroundOrbs />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GlassColors.cyan} />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!store || !overallStats) return null;

  // Filter tracked subjects
  const filteredSubjects = store.subjects.filter((s) => {
    if (!s.isTracked) return false;
    if (activeTab === 'lecture') return s.classType === 'lecture';
    if (activeTab === 'lab') return s.classType === 'lab';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackgroundOrbs />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={GlassColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Attendance Tracker</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser?.divisionId || 'Semester'} Overview
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setSettingsVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={20} color={GlassColors.cyanBright} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GlassColors.cyan} />
        }
      >
        {/* Quick Action: Mark Today Attendance Banner */}
        <TouchableOpacity
          style={styles.markBanner}
          onPress={() => router.push('/mark-attendance' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.markBannerLeft}>
            <View style={styles.markIconBox}>
              <Ionicons name="calendar-outline" size={22} color="#060A17" />
            </View>
            <View>
              <Text style={styles.markBannerTitle}>Mark Today's Classes</Text>
              <Text style={styles.markBannerSubtitle}>
                {pendingToday > 0
                  ? `⚡ ${pendingToday} class${pendingToday > 1 ? 'es' : ''} waiting to be marked`
                  : 'All scheduled classes recorded today'}
              </Text>
            </View>
          </View>
          <View style={styles.markBannerArrow}>
            <Ionicons name="chevron-forward" size={18} color="#060A17" />
          </View>
        </TouchableOpacity>

        {/* 4 Levels of Attendance Overview Card */}
        <GlassCard style={styles.statsOverviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>SEMESTER ATTENDANCE CRITERIA</Text>
            <Text style={styles.overviewCount}>
              {overallStats.totalAttended} / {overallStats.totalConducted} classes
            </Text>
          </View>

          {/* 3 Circular Rings (Overall, Lecture, Lab) */}
          <View style={styles.ringsRow}>
            <CircularProgress
              percentage={overallStats.overallPercentage}
              label="Overall"
              sublabel={`${overallStats.totalAttended}/${overallStats.totalConducted}`}
              color={GlassColors.cyan}
              size={92}
            />

            <CircularProgress
              percentage={overallStats.lecturePercentage}
              target={overallStats.lectureTarget}
              label="Lectures"
              sublabel={`${overallStats.lectureAttended}/${overallStats.lectureConducted}`}
              color={GlassColors.cyanBright}
              size={92}
            />

            <CircularProgress
              percentage={overallStats.labPercentage}
              target={overallStats.labTarget}
              label="Labs"
              sublabel={`${overallStats.labAttended}/${overallStats.labConducted}`}
              color={GlassColors.purple}
              size={92}
            />
          </View>

          {/* Quick Metrics Strip */}
          <View style={styles.quickMetricsStrip}>
            <View style={styles.quickMetric}>
              <Text style={styles.qmLabel}>TOTAL ATTENDED</Text>
              <Text style={[styles.qmValue, { color: GlassColors.emerald }]}>
                {overallStats.totalAttended}
              </Text>
            </View>
            <View style={styles.qmDivider} />
            <View style={styles.quickMetric}>
              <Text style={styles.qmLabel}>MISSED</Text>
              <Text style={[styles.qmValue, { color: GlassColors.rose }]}>
                {Math.max(0, overallStats.totalConducted - overallStats.totalAttended)}
              </Text>
            </View>
            <View style={styles.qmDivider} />
            <View style={styles.quickMetric}>
              <Text style={styles.qmLabel}>TARGET LEC</Text>
              <Text style={[styles.qmValue, { color: GlassColors.cyan }]}>
                {overallStats.lectureTarget}%
              </Text>
            </View>
            <View style={styles.qmDivider} />
            <View style={styles.quickMetric}>
              <Text style={styles.qmLabel}>TARGET LAB</Text>
              <Text style={[styles.qmValue, { color: GlassColors.purple }]}>
                {overallStats.labTarget}%
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Level 1: Individual Subjects Header & Filter Tabs */}
        <View style={styles.subjectsHeaderRow}>
          <Text style={styles.subjectsHeaderTitle}>
            INDIVIDUAL SUBJECTS ({filteredSubjects.length})
          </Text>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'lecture' && styles.tabBtnActive]}
              onPress={() => setActiveTab('lecture')}
            >
              <Text style={[styles.tabText, activeTab === 'lecture' && styles.tabTextActive]}>
                Lectures
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'lab' && styles.tabBtnActive]}
              onPress={() => setActiveTab('lab')}
            >
              <Text style={[styles.tabText, activeTab === 'lab' && styles.tabTextActive]}>
                Labs
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Subjects List */}
        {filteredSubjects.length === 0 ? (
          <GlassCard style={styles.emptyStateCard}>
            <Ionicons name="folder-open-outline" size={36} color={GlassColors.textMuted} />
            <Text style={styles.emptyStateTitle}>No subjects in this category</Text>
            <Text style={styles.emptyStateSubtitle}>
              You can adjust tracked subjects in Settings.
            </Text>
          </GlassCard>
        ) : (
          filteredSubjects.map((subj) => {
            const stats = getSubjectStats(store, subj.id);
            if (!stats) return null;

            return (
              <AttendanceSubjectCard
                key={subj.id}
                subject={subj}
                stats={stats}
                onImportPress={() => setSelectedSubjectForImport(subj)}
                onHistoryPress={() => setSelectedSubjectForHistory(subj)}
              />
            );
          })
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modals */}
      <PreviousAttendanceModal
        visible={!!selectedSubjectForImport}
        subject={selectedSubjectForImport}
        onClose={() => setSelectedSubjectForImport(null)}
        onSaved={loadData}
      />

      <AttendanceHistoryModal
        visible={!!selectedSubjectForHistory}
        subject={selectedSubjectForHistory}
        onClose={() => setSelectedSubjectForHistory(null)}
        onDataChanged={loadData}
      />

      <AttendanceSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSettingsChanged={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GlassColors.bgDark,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GlassColors.borderMuted,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: GlassColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: GlassColors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  markBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GlassColors.cyan,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  markBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  markIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6, 10, 23, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#060A17',
  },
  markBannerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#060A17',
    opacity: 0.85,
    marginTop: 1,
  },
  markBannerArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 10, 23, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsOverviewCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'rgba(11, 19, 43, 0.8)',
    marginBottom: 18,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  overviewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.8,
  },
  overviewCount: {
    fontSize: 12,
    color: GlassColors.textSecondary,
    fontWeight: '700',
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 6,
  },
  quickMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  quickMetric: {
    flex: 1,
    alignItems: 'center',
  },
  qmDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  qmLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: GlassColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  qmValue: {
    fontSize: 13,
    fontWeight: '800',
    color: GlassColors.textPrimary,
  },
  subjectsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  subjectsHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.textMuted,
    letterSpacing: 0.8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 2,
  },
  tabBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: GlassColors.textMuted,
  },
  tabTextActive: {
    color: GlassColors.cyanBright,
    fontWeight: '800',
  },
  emptyStateCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GlassColors.textSecondary,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: GlassColors.textMuted,
  },
});
