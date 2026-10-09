import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassColors } from '@/theme/glass-theme';
import {
  AttendanceStore,
  getAttendanceStore,
  updateGlobalTargets,
  saveAttendanceStore,
  addManualSubject,
  resetAttendanceData,
} from '@/services/attendance-service';

interface AttendanceSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSettingsChanged: () => void;
}

export const AttendanceSettingsModal: React.FC<AttendanceSettingsModalProps> = ({
  visible,
  onClose,
  onSettingsChanged,
}) => {
  const [store, setStore] = useState<AttendanceStore | null>(null);
  const [lectureTarget, setLectureTarget] = useState('75');
  const [labTarget, setLabTarget] = useState('100');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectType, setNewSubjectType] = useState<'lecture' | 'lab'>('lecture');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const s = await getAttendanceStore();
      setStore({ ...s });
      setLectureTarget(String(s.lectureTarget ?? 75));
      setLabTarget(String(s.labTarget ?? 100));
      setError(null);
    } catch (e) {
      console.warn('Failed to load store in settings:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  if (!store) return null;

  const handleSaveTargets = async () => {
    const lec = parseInt(lectureTarget.trim(), 10);
    const lab = parseInt(labTarget.trim(), 10);

    if (isNaN(lec) || lec < 0 || lec > 100) {
      setError('Lecture target must be between 0% and 100%');
      return;
    }
    if (isNaN(lab) || lab < 0 || lab > 100) {
      setError('Lab target must be between 0% and 100%');
      return;
    }

    try {
      await updateGlobalTargets(lec, lab);
      onSettingsChanged();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update targets');
    }
  };

  const handleToggleTrackSubject = async (subjectId: string) => {
    if (!store) return;
    const updated = { ...store };
    const subj = updated.subjects.find((s) => s.id === subjectId);
    if (subj) {
      subj.isTracked = !subj.isTracked;
      setStore(updated);
      await saveAttendanceStore(updated);
      onSettingsChanged();
    }
  };

  const handleAddNewSubject = async () => {
    if (!newSubjectName.trim()) {
      setError('Please enter a subject name');
      return;
    }

    try {
      await addManualSubject(newSubjectName.trim(), newSubjectType);
      setNewSubjectName('');
      setShowAddForm(false);
      await loadData();
      onSettingsChanged();
    } catch (e: any) {
      setError(e?.message || 'Failed to add subject');
    }
  };

  const handleResetData = async () => {
    const doReset = async () => {
      try {
        await resetAttendanceData();
        onSettingsChanged();
        onClose();
      } catch (e) {
        console.warn('Failed to reset:', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('⚠️ WARNING: This will reset all your attendance logs and tracked subjects. Are you sure?')) {
        await doReset();
      }
    } else {
      Alert.alert(
        'Reset Attendance Data',
        '⚠️ Are you sure you want to reset all tracked subjects and attendance records?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset Everything', style: 'destructive', onPress: doReset },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings" size={20} color={GlassColors.cyanBright} />
              <Text style={styles.title}>Attendance Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={GlassColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Target Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🎯 DEFAULT TARGET CRITERIA</Text>
              
              <View style={styles.targetRow}>
                <View style={styles.targetCol}>
                  <Text style={styles.inputLabel}>Lecture Target (%)</Text>
                  <TextInput
                    style={styles.targetInput}
                    keyboardType="number-pad"
                    value={lectureTarget}
                    onChangeText={(t) => {
                      setLectureTarget(t);
                      setError(null);
                    }}
                    placeholder="75"
                    placeholderTextColor={GlassColors.textMuted}
                  />
                  <Text style={styles.inputHint}>Default: 75%</Text>
                </View>

                <View style={styles.targetCol}>
                  <Text style={styles.inputLabel}>Lab Target (%)</Text>
                  <TextInput
                    style={styles.targetInput}
                    keyboardType="number-pad"
                    value={labTarget}
                    onChangeText={(t) => {
                      setLabTarget(t);
                      setError(null);
                    }}
                    placeholder="100"
                    placeholderTextColor={GlassColors.textMuted}
                  />
                  <Text style={styles.inputHint}>Default: 100%</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.saveTargetBtn} onPress={handleSaveTargets}>
                <Text style={styles.saveTargetBtnText}>Save Target Criteria</Text>
              </TouchableOpacity>
            </View>

            {/* Tracked Subjects Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>📚 SEMESTER SUBJECTS</Text>
                <TouchableOpacity
                  style={styles.addSubjectToggle}
                  onPress={() => setShowAddForm(!showAddForm)}
                >
                  <Ionicons name={showAddForm ? 'close' : 'add'} size={16} color={GlassColors.cyanBright} />
                  <Text style={styles.addSubjectToggleText}>
                    {showAddForm ? 'Cancel' : 'Add Subject'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Add Custom Subject Form */}
              {showAddForm && (
                <View style={styles.addForm}>
                  <Text style={styles.inputLabel}>Subject Name</Text>
                  <TextInput
                    style={styles.subjectInput}
                    value={newSubjectName}
                    onChangeText={setNewSubjectName}
                    placeholder="e.g. DATA STRUCTURES"
                    placeholderTextColor={GlassColors.textMuted}
                  />

                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[
                        styles.typeBtn,
                        newSubjectType === 'lecture' && styles.typeBtnActiveLecture,
                      ]}
                      onPress={() => setNewSubjectType('lecture')}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          newSubjectType === 'lecture' && { color: GlassColors.cyan },
                        ]}
                      >
                        Lecture (75%)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeBtn,
                        newSubjectType === 'lab' && styles.typeBtnActiveLab,
                      ]}
                      onPress={() => setNewSubjectType('lab')}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          newSubjectType === 'lab' && { color: GlassColors.purple },
                        ]}
                      >
                        Lab / Practical (100%)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.submitAddBtn} onPress={handleAddNewSubject}>
                    <Text style={styles.submitAddBtnText}>Add to Tracker</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subject list */}
              <View style={styles.subjectList}>
                {store.subjects.map((subj) => {
                  const isLab = subj.classType === 'lab';
                  return (
                    <TouchableOpacity
                      key={subj.id}
                      style={[
                        styles.subjectRow,
                        !subj.isTracked && styles.subjectRowDisabled,
                      ]}
                      onPress={() => handleToggleTrackSubject(subj.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.subjectRowLeft}>
                        <Ionicons
                          name={subj.isTracked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={subj.isTracked ? GlassColors.cyan : GlassColors.textMuted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.subjTitle,
                              !subj.isTracked && { color: GlassColors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {subj.subjectName}
                          </Text>
                          <Text style={styles.subTypeDesc}>
                            {isLab ? 'Lab / Practical' : 'Lecture'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.trackStatus, { color: subj.isTracked ? GlassColors.emerald : GlassColors.textMuted }]}>
                        {subj.isTracked ? 'TRACKED' : 'EXCLUDED'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Error box */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={GlassColors.rose} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerSection}>
              <Text style={styles.dangerHeader}>⚠️ DANGER ZONE</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
                <Ionicons name="trash-bin-outline" size={16} color={GlassColors.rose} />
                <Text style={styles.resetBtnText}>Reset All Attendance Data</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#0B132B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    padding: 18,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  section: {
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSubjectToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  addSubjectToggleText: {
    fontSize: 11,
    color: GlassColors.cyanBright,
    fontWeight: '700',
  },
  targetRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  targetCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GlassColors.textSecondary,
    marginBottom: 4,
  },
  targetInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inputHint: {
    fontSize: 9,
    color: GlassColors.textMuted,
    marginTop: 2,
  },
  saveTargetBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: GlassColors.cyan,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveTargetBtnText: {
    color: GlassColors.cyanBright,
    fontSize: 12,
    fontWeight: '700',
  },
  addForm: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  subjectInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  typeBtnActiveLecture: {
    borderColor: GlassColors.cyan,
    backgroundColor: GlassColors.cyanDim,
  },
  typeBtnActiveLab: {
    borderColor: GlassColors.purple,
    backgroundColor: GlassColors.purpleDim,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: GlassColors.textMuted,
  },
  submitAddBtn: {
    backgroundColor: GlassColors.cyan,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  submitAddBtnText: {
    color: '#060A17',
    fontSize: 12,
    fontWeight: '800',
  },
  subjectList: {
    gap: 6,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subjectRowDisabled: {
    opacity: 0.5,
  },
  subjectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  subjTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  subTypeDesc: {
    fontSize: 10,
    color: GlassColors.textMuted,
    marginTop: 1,
  },
  trackStatus: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GlassColors.roseDim,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: GlassColors.rose,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  dangerSection: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 63, 94, 0.2)',
  },
  dangerHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: GlassColors.rose,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: GlassColors.roseDim,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  resetBtnText: {
    color: GlassColors.rose,
    fontSize: 12,
    fontWeight: '700',
  },
});
