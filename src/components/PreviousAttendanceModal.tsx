import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassColors } from '@/theme/glass-theme';
import { TrackedSubject, importPreviousAttendance } from '@/services/attendance-service';

interface PreviousAttendanceModalProps {
  visible: boolean;
  subject: TrackedSubject | null;
  onClose: () => void;
  onSaved: () => void;
}

export const PreviousAttendanceModal: React.FC<PreviousAttendanceModalProps> = ({
  visible,
  subject,
  onClose,
  onSaved,
}) => {
  const [conductedText, setConductedText] = useState('');
  const [attendedText, setAttendedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (subject) {
      setConductedText(subject.previousConducted > 0 ? String(subject.previousConducted) : '');
      setAttendedText(subject.previousAttended > 0 ? String(subject.previousAttended) : '');
      setError(null);
    }
  }, [subject, visible]);

  if (!subject) return null;

  const handleSave = async () => {
    setError(null);
    const conducted = conductedText.trim() === '' ? 0 : parseInt(conductedText.trim(), 10);
    const attended = attendedText.trim() === '' ? 0 : parseInt(attendedText.trim(), 10);

    if (isNaN(conducted) || conducted < 0) {
      setError('Total conducted classes must be a positive number');
      return;
    }
    if (isNaN(attended) || attended < 0) {
      setError('Attended classes must be a positive number');
      return;
    }
    if (attended > conducted) {
      setError('Attended classes cannot exceed total conducted classes');
      return;
    }

    try {
      setIsSaving(true);
      const res = await importPreviousAttendance(subject.id, conducted, attended);
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setError(res.error || 'Failed to save');
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsSaving(true);
      await importPreviousAttendance(subject.id, 0, 0);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to clear');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Ionicons name="cloud-upload" size={20} color={GlassColors.cyanBright} />
                  <Text style={styles.title}>Past Attendance Totals</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={GlassColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Subject Title */}
              <View style={styles.subjectBox}>
                <Text style={styles.subjectType}>
                  {subject.classType.toUpperCase()}
                </Text>
                <Text style={styles.subjectName}>{subject.subjectName}</Text>
              </View>

              <Text style={styles.helpText}>
                If you already had classes before using this app, enter your historical totals below.
                These will be factored into all semester calculations.
              </Text>

              {/* Input Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Conducted Classes So Far</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={conductedText}
                  onChangeText={(t) => {
                    setConductedText(t);
                    setError(null);
                  }}
                  placeholder="e.g. 14"
                  placeholderTextColor={GlassColors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Classes You Attended</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={attendedText}
                  onChangeText={(t) => {
                    setAttendedText(t);
                    setError(null);
                  }}
                  placeholder="e.g. 12"
                  placeholderTextColor={GlassColors.textMuted}
                />
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={GlassColors.rose} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {subject.previousConducted > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={handleClear}
                    disabled={isSaving}
                  >
                    <Text style={styles.clearBtnText}>Clear Totals</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveBtnText}>
                    {isSaving ? 'Saving...' : 'Save Totals'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: '#0B132B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    padding: 20,
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  subjectBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subjectType: {
    fontSize: 10,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  helpText: {
    fontSize: 12,
    color: GlassColors.textSecondary,
    lineHeight: 17,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: GlassColors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GlassColors.roseDim,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: GlassColors.rose,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: GlassColors.roseDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: GlassColors.rose,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: GlassColors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#060A17',
    fontSize: 14,
    fontWeight: '800',
  },
});
