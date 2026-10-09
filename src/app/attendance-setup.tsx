import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackgroundOrbs } from '@/components/BackgroundOrbs';
import { GlassCard } from '@/components/GlassCard';
import { GlassColors } from '@/theme/glass-theme';
import { getCurrentUser, UserAccount } from '@/storage/preferences-storage';
import {
  extractUniqueSubjects,
  DetectedSubject,
  setupAttendance,
  makeSubjectId,
} from '@/services/attendance-service';

interface SetupSubjectItem {
  id: string;
  subjectName: string;
  classType: 'lecture' | 'lab';
  selected: boolean;
  occurrences: number;
}

export default function AttendanceSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [subjects, setSubjects] = useState<SetupSubjectItem[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState<'lecture' | 'lab'>('lecture');
  const [showManualForm, setShowManualForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        if (user && user.branchId && user.divisionId && user.subdivisionId) {
          const detected = extractUniqueSubjects(
            user.branchId,
            user.divisionId,
            user.subdivisionId,
            user.username
          );

          const items: SetupSubjectItem[] = detected.map((d) => ({
            id: d.id,
            subjectName: d.subjectName,
            classType: d.classType,
            selected: true, // selected by default
            occurrences: d.occurrences,
          }));

          setSubjects(items);
        }
      } catch (e) {
        console.warn('Error loading detected subjects:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSelect = (id: string) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const toggleType = (id: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              classType: s.classType === 'lecture' ? 'lab' : 'lecture',
              id: makeSubjectId(s.subjectName, s.classType === 'lecture' ? 'lab' : 'lecture'),
            }
          : s
      )
    );
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return;
    const cleanName = manualName.trim().toUpperCase();
    const id = makeSubjectId(cleanName, manualType);

    if (subjects.some((s) => s.id === id)) {
      alert('This subject is already in the list.');
      return;
    }

    setSubjects((prev) => [
      ...prev,
      {
        id,
        subjectName: cleanName,
        classType: manualType,
        selected: true,
        occurrences: 0,
      },
    ]);

    setManualName('');
    setShowManualForm(false);
  };

  const handleStartTracking = async () => {
    const selected = subjects.filter((s) => s.selected);
    if (selected.length === 0) {
      alert('Please select at least one subject to track.');
      return;
    }

    try {
      setSaving(true);
      await setupAttendance(
        selected.map((s) => ({
          id: s.id,
          subjectName: s.subjectName,
          classType: s.classType,
        }))
      );
      router.replace('/attendance' as any);
    } catch (e) {
      console.warn('Failed to save setup:', e);
      alert('Failed to save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = subjects.filter((s) => s.selected).length;

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
          <Ionicons name="arrow-back" size={24} color={GlassColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Setup</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GlassColors.cyan} />
          <Text style={styles.loadingText}>Reading your timetable subjects...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Welcome Card */}
          <GlassCard style={styles.introCard}>
            <View style={styles.introIconBox}>
              <Ionicons name="shield-checkmark" size={28} color={GlassColors.cyanBright} />
            </View>
            <Text style={styles.introTitle}>Smart Attendance Tracker</Text>
            <Text style={styles.introDesc}>
              We auto-detected your semester subjects from your timetable. Select which subjects
              should count toward your attendance criteria.
            </Text>

            <View style={styles.targetsInfoRow}>
              <View style={styles.targetInfoBadge}>
                <Text style={styles.targetInfoLabel}>LECTURE TARGET</Text>
                <Text style={styles.targetInfoVal}>75%</Text>
              </View>
              <View style={[styles.targetInfoBadge, { borderColor: 'rgba(168, 85, 247, 0.4)' }]}>
                <Text style={[styles.targetInfoLabel, { color: GlassColors.purple }]}>LAB / PRACTICAL</Text>
                <Text style={[styles.targetInfoVal, { color: GlassColors.purple }]}>100%</Text>
              </View>
            </View>
          </GlassCard>

          {/* Subjects Selection List */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              SUBJECTS ({selectedCount} SELECTED)
            </Text>
            <TouchableOpacity
              style={styles.addManualBtn}
              onPress={() => setShowManualForm(!showManualForm)}
            >
              <Ionicons name={showManualForm ? 'close' : 'add'} size={16} color={GlassColors.cyanBright} />
              <Text style={styles.addManualBtnText}>
                {showManualForm ? 'Cancel' : 'Add Subject'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Manual Subject Form */}
          {showManualForm && (
            <GlassCard style={styles.manualCard}>
              <Text style={styles.manualTitle}>Add Custom Subject</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Subject Name (e.g. COMPILER DESIGN)"
                placeholderTextColor={GlassColors.textMuted}
                value={manualName}
                onChangeText={setManualName}
              />
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeChoice,
                    manualType === 'lecture' && styles.typeChoiceActiveLec,
                  ]}
                  onPress={() => setManualType('lecture')}
                >
                  <Text
                    style={[
                      styles.typeChoiceText,
                      manualType === 'lecture' && { color: GlassColors.cyan },
                    ]}
                  >
                    Lecture (75%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeChoice,
                    manualType === 'lab' && styles.typeChoiceActiveLab,
                  ]}
                  onPress={() => setManualType('lab')}
                >
                  <Text
                    style={[
                      styles.typeChoiceText,
                      manualType === 'lab' && { color: GlassColors.purple },
                    ]}
                  >
                    Lab / Practical (100%)
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.addManualConfirm} onPress={handleAddManual}>
                <Text style={styles.addManualConfirmText}>Add to List</Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Subject Items */}
          {subjects.map((item) => {
            const isLab = item.classType === 'lab';
            return (
              <GlassCard
                key={item.id}
                style={[
                  styles.subjectCard,
                  !item.selected && styles.subjectCardDeselected,
                ]}
              >
                <TouchableOpacity
                  style={styles.subjectSelectArea}
                  onPress={() => toggleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.selected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={item.selected ? GlassColors.cyan : GlassColors.textMuted}
                  />
                  <View style={styles.subjectInfo}>
                    <Text
                      style={[
                        styles.subjectNameText,
                        !item.selected && { color: GlassColors.textMuted },
                      ]}
                      numberOfLines={2}
                    >
                      {item.subjectName}
                    </Text>
                    {item.occurrences > 0 && (
                      <Text style={styles.occurrencesText}>
                        🗓️ {item.occurrences} slot{item.occurrences > 1 ? 's' : ''}/week
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Type Switcher */}
                <TouchableOpacity
                  style={[
                    styles.typeBadgeBtn,
                    {
                      borderColor: isLab ? GlassColors.purple : GlassColors.cyan,
                      backgroundColor: isLab ? GlassColors.purpleDim : GlassColors.cyanDim,
                    },
                  ]}
                  onPress={() => toggleType(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBadgeBtnText, { color: isLab ? GlassColors.purple : GlassColors.cyan }]}>
                    {isLab ? 'LAB (100%)' : 'LEC (75%)'}
                  </Text>
                  <Ionicons name="swap-horizontal" size={12} color={isLab ? GlassColors.purple : GlassColors.cyan} />
                </TouchableOpacity>
              </GlassCard>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom Sticky Action Bar */}
      {!loading && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.startBtn, saving && { opacity: 0.6 }]}
            onPress={handleStartTracking}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={18} color="#060A17" />
            <Text style={styles.startBtnText}>
              {saving ? 'Setting up...' : `Start Tracking (${selectedCount} Subjects)`}
            </Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: GlassColors.textPrimary,
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
  introCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  introIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: GlassColors.textPrimary,
    marginBottom: 6,
  },
  introDesc: {
    fontSize: 13,
    color: GlassColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  targetsInfoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  targetInfoBadge: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
  },
  targetInfoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.5,
  },
  targetInfoVal: {
    fontSize: 16,
    fontWeight: '800',
    color: GlassColors.cyan,
    marginTop: 2,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.textMuted,
    letterSpacing: 0.8,
  },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  addManualBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: GlassColors.cyanBright,
  },
  manualCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  manualTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.textPrimary,
    marginBottom: 8,
  },
  manualInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeChoice: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  typeChoiceActiveLec: {
    borderColor: GlassColors.cyan,
    backgroundColor: GlassColors.cyanDim,
  },
  typeChoiceActiveLab: {
    borderColor: GlassColors.purple,
    backgroundColor: GlassColors.purpleDim,
  },
  typeChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: GlassColors.textMuted,
  },
  addManualConfirm: {
    backgroundColor: GlassColors.cyan,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addManualConfirmText: {
    color: '#060A17',
    fontSize: 12,
    fontWeight: '800',
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: GlassColors.borderLight,
  },
  subjectCardDeselected: {
    opacity: 0.45,
  },
  subjectSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassColors.textPrimary,
    lineHeight: 18,
  },
  occurrencesText: {
    fontSize: 11,
    color: GlassColors.textMuted,
    marginTop: 2,
  },
  typeBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6, 10, 23, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: GlassColors.borderLight,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GlassColors.cyan,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    color: '#060A17',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
