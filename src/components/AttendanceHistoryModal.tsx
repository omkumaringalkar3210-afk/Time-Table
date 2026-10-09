import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassColors } from '@/theme/glass-theme';
import {
  TrackedSubject,
  AttendanceRecord,
  AttendanceStatus,
  getAttendanceStore,
  getSubjectRecords,
  markAttendance,
  saveAttendanceStore,
} from '@/services/attendance-service';

interface AttendanceHistoryModalProps {
  visible: boolean;
  subject: TrackedSubject | null;
  onClose: () => void;
  onDataChanged: () => void;
}

export const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
  visible,
  subject,
  onClose,
  onDataChanged,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecords = async () => {
    if (!subject) return;
    setLoading(true);
    try {
      const store = await getAttendanceStore();
      const recs = getSubjectRecords(store, subject.id);
      setRecords(recs);
    } catch (e) {
      console.warn('Failed to load subject records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && subject) {
      loadRecords();
    }
  }, [visible, subject]);

  if (!subject) return null;

  const handleUpdateStatus = async (record: AttendanceRecord, newStatus: AttendanceStatus) => {
    try {
      await markAttendance({
        subjectId: record.subjectId,
        date: record.date,
        dayNum: record.dayNum,
        slotTime: record.slotTime,
        status: newStatus,
        isManualHistory: record.isManualHistory,
      });
      await loadRecords();
      onDataChanged();
    } catch (e) {
      console.warn('Failed to update record:', e);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    const doDelete = async () => {
      try {
        const store = await getAttendanceStore();
        store.records = store.records.filter((r) => r.id !== recordId);
        await saveAttendanceStore(store);
        await loadRecords();
        onDataChanged();
      } catch (e) {
        console.warn('Failed to delete record:', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this attendance record?')) {
        await doDelete();
      }
    } else {
      Alert.alert('Delete Record', 'Are you sure you want to delete this attendance log?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return { label: 'PRESENT', color: GlassColors.emerald, bg: GlassColors.emeraldDim };
      case 'absent':
        return { label: 'ABSENT', color: GlassColors.rose, bg: GlassColors.roseDim };
      case 'cancelled':
        return { label: 'CANCELLED', color: GlassColors.amber, bg: GlassColors.amberDim };
      default:
        return { label: 'UNMARKED', color: GlassColors.textMuted, bg: 'rgba(255,255,255,0.06)' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="time" size={20} color={GlassColors.cyanBright} />
              <View>
                <Text style={styles.title}>Attendance History</Text>
                <Text style={styles.subTitle} numberOfLines={1}>
                  {subject.subjectName} ({subject.classType.toUpperCase()})
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={GlassColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Historical imported note */}
          {subject.previousConducted > 0 && (
            <View style={styles.historyNotice}>
              <Ionicons name="information-circle" size={16} color={GlassColors.cyanBright} />
              <Text style={styles.historyNoticeText}>
                Historical import: {subject.previousAttended} attended / {subject.previousConducted} conducted
              </Text>
            </View>
          )}

          {/* Records List */}
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={38} color={GlassColors.textMuted} />
                <Text style={styles.emptyTitle}>No individual logs yet</Text>
                <Text style={styles.emptySubtitle}>
                  Attendance marked from the daily tracker will appear here.
                </Text>
              </View>
            ) : (
              records.map((record) => {
                const badge = getStatusBadge(record.status);
                return (
                  <View key={record.id} style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordDate}>{record.date}</Text>
                      <Text style={styles.recordSlot}>⏰ {record.slotTime}</Text>
                    </View>

                    {/* Status switcher */}
                    <View style={styles.statusButtons}>
                      <TouchableOpacity
                        style={[
                          styles.statusToggleBtn,
                          record.status === 'present' && { backgroundColor: GlassColors.emerald, borderColor: GlassColors.emerald },
                        ]}
                        onPress={() => handleUpdateStatus(record, 'present')}
                      >
                        <Text
                          style={[
                            styles.statusToggleText,
                            record.status === 'present' && { color: '#060A17', fontWeight: '800' },
                          ]}
                        >
                          P
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusToggleBtn,
                          record.status === 'absent' && { backgroundColor: GlassColors.rose, borderColor: GlassColors.rose },
                        ]}
                        onPress={() => handleUpdateStatus(record, 'absent')}
                      >
                        <Text
                          style={[
                            styles.statusToggleText,
                            record.status === 'absent' && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          A
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusToggleBtn,
                          record.status === 'cancelled' && { backgroundColor: GlassColors.amber, borderColor: GlassColors.amber },
                        ]}
                        onPress={() => handleUpdateStatus(record, 'cancelled')}
                      >
                        <Text
                          style={[
                            styles.statusToggleText,
                            record.status === 'cancelled' && { color: '#060A17', fontWeight: '800' },
                          ]}
                        >
                          C
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteRecord(record.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={GlassColors.rose} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close History</Text>
          </TouchableOpacity>
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
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  subTitle: {
    fontSize: 12,
    color: GlassColors.textSecondary,
    maxWidth: 240,
  },
  closeBtn: {
    padding: 4,
  },
  historyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  historyNoticeText: {
    fontSize: 11,
    color: GlassColors.cyanBright,
    fontWeight: '600',
    flex: 1,
  },
  scrollList: {
    flexGrow: 0,
    marginVertical: 4,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GlassColors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: GlassColors.textMuted,
    textAlign: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  recordLeft: {
    flex: 1,
  },
  recordDate: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  recordSlot: {
    fontSize: 11,
    color: GlassColors.textMuted,
    marginTop: 2,
  },
  statusButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: GlassColors.textSecondary,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  doneBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: GlassColors.borderLight,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
});
