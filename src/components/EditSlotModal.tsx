import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimetableEntry } from '@/data/timetable-data';
import { buildCustomSlotEntry } from '@/services/custom-timetable-service';
import { GlassColors, GlassShadows } from '@/theme/glass-theme';
import { ConfirmModal } from '@/components/ConfirmModal';

const TIME_PRESETS = [
  { label: '08:30 – 09:30 AM', start: '08:30 AM', end: '09:30 AM' },
  { label: '09:30 – 10:30 AM', start: '09:30 AM', end: '10:30 AM' },
  { label: '10:45 – 11:45 AM', start: '10:45 AM', end: '11:45 AM' },
  { label: '11:45 – 12:45 PM', start: '11:45 AM', end: '12:45 PM' },
  { label: '08:30 – 10:30 AM (2 hr)', start: '08:30 AM', end: '10:30 AM' },
  { label: '10:45 – 12:45 PM (2 hr)', start: '10:45 AM', end: '12:45 PM' },
  { label: '01:30 – 02:30 PM', start: '01:30 PM', end: '02:30 PM' },
  { label: '02:30 – 03:30 PM', start: '02:30 PM', end: '03:30 PM' },
  { label: '01:30 – 03:30 PM (2 hr)', start: '01:30 PM', end: '03:30 PM' },
];

interface EditSlotModalProps {
  visible: boolean;
  dayLabel: string;
  slotIndex: number;
  initialSlot: TimetableEntry | null;
  defaultSlot?: TimetableEntry;
  isNewSlot?: boolean;
  onSave: (updatedSlot: TimetableEntry) => void;
  onRevert?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function EditSlotModal({
  visible,
  dayLabel,
  slotIndex,
  initialSlot,
  defaultSlot,
  isNewSlot = false,
  onSave,
  onRevert,
  onDelete,
  onClose,
}: EditSlotModalProps) {
  const [subject, setSubject] = useState('');
  const [classType, setClassType] = useState<'lecture' | 'lab'>('lecture');
  const [startTime, setStartTime] = useState('08:30 AM');
  const [endTime, setEndTime] = useState('09:30 AM');
  const [room, setRoom] = useState('');
  const [teacher, setTeacher] = useState('');

  // Confirmation dialogs
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state when initialSlot changes
  useEffect(() => {
    if (initialSlot) {
      setSubject(initialSlot.subject || '');
      setClassType(initialSlot.type === 'lab' ? 'lab' : 'lecture');
      setStartTime(initialSlot.startTime || '08:30 AM');
      setEndTime(initialSlot.endTime || '09:30 AM');
      setRoom(initialSlot.room === '-' ? '' : initialSlot.room || '');
      setTeacher(initialSlot.teacher === '-' ? '' : initialSlot.teacher || '');
    } else {
      setSubject('');
      setClassType('lecture');
      setStartTime('08:30 AM');
      setEndTime('09:30 AM');
      setRoom('');
      setTeacher('');
    }
  }, [initialSlot, visible]);

  if (!visible) return null;

  const handleApplyPreset = (preset: { start: string; end: string }) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  const handleTriggerSave = () => {
    if (!subject.trim()) {
      alert('Please enter a subject name.');
      return;
    }
    // Show confirmation dialog before committing change
    setShowSaveConfirm(true);
  };

  const handleConfirmedSave = () => {
    setShowSaveConfirm(false);
    const updated = buildCustomSlotEntry({
      subject,
      type: classType,
      startTime,
      endTime,
      room,
      teacher,
    });
    onSave(updated);
  };

  const handleConfirmedRevert = () => {
    setShowRevertConfirm(false);
    onRevert?.();
  };

  const handleConfirmedDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropOverlay} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSuperText}>
                {isNewSlot ? 'ADD CLASS' : `EDITING ${dayLabel.toUpperCase()}`}
              </Text>
              <Text style={styles.headerTitle}>
                {isNewSlot ? 'New Timetable Session' : `Session #${slotIndex + 1}: ${subject || 'Class'}`}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={20} color={GlassColors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── 1. SUBJECT NAME ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="book-outline" size={13} color={GlassColors.cyan} /> SUBJECT / COURSE NAME
              </Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. CAL, ICPDS, PHYSICS"
                placeholderTextColor={GlassColors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            {/* ── 2. CLASS TYPE (CLASSROOM VS LAB) ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="layers-outline" size={13} color={GlassColors.cyan} /> CLASS TYPE
              </Text>
              <View style={styles.typeSelectorRow}>
                {/* Classroom / Lecture */}
                <Pressable
                  onPress={() => setClassType('lecture')}
                  style={[
                    styles.typeCard,
                    classType === 'lecture' && styles.typeCardLectureActive,
                  ]}
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color={classType === 'lecture' ? GlassColors.cyan : GlassColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeCardText,
                      classType === 'lecture' && { color: GlassColors.cyan, fontWeight: '800' },
                    ]}
                  >
                    Classroom
                  </Text>
                  <Text style={styles.typeCardSub}>Theory / Lecture</Text>
                </Pressable>

                {/* Lab / Practical */}
                <Pressable
                  onPress={() => setClassType('lab')}
                  style={[
                    styles.typeCard,
                    classType === 'lab' && styles.typeCardLabActive,
                  ]}
                >
                  <Ionicons
                    name="flask-outline"
                    size={20}
                    color={classType === 'lab' ? GlassColors.emerald : GlassColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeCardText,
                      classType === 'lab' && { color: GlassColors.emerald, fontWeight: '800' },
                    ]}
                  >
                    Lab
                  </Text>
                  <Text style={styles.typeCardSub}>Practical / Hands-on</Text>
                </Pressable>
              </View>
            </View>

            {/* ── 3. TIMING ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="time-outline" size={13} color={GlassColors.cyan} /> TIMING (START & END)
              </Text>
              <View style={styles.timeInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>Starts</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="08:30 AM"
                    placeholderTextColor={GlassColors.textMuted}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.timeSeparator}>
                  <Text style={{ color: GlassColors.textMuted, fontSize: 16 }}>—</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>Ends</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="09:30 AM"
                    placeholderTextColor={GlassColors.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Quick Preset Buttons */}
              <Text style={[styles.subLabel, { marginTop: 10, marginBottom: 6 }]}>
                Quick Time Presets:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsTrack}
              >
                {TIME_PRESETS.map((p, idx) => {
                  const isCurrent = startTime === p.start && endTime === p.end;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handleApplyPreset(p)}
                      style={[
                        styles.presetChip,
                        isCurrent && styles.presetChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          isCurrent && styles.presetTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── 4. ROOM NUMBER ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="location-outline" size={13} color={GlassColors.cyan} /> ROOM NUMBER / VENUE
              </Text>
              <TextInput
                style={styles.textInput}
                value={room}
                onChangeText={setRoom}
                placeholder="e.g. B-304, B-216, CAD Lab"
                placeholderTextColor={GlassColors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            {/* ── 5. FACULTY / TEACHER ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="person-outline" size={13} color={GlassColors.cyan} /> FACULTY / TEACHER NAME
              </Text>
              <TextInput
                style={styles.textInput}
                value={teacher}
                onChangeText={setTeacher}
                placeholder="e.g. Ms. Kavita Borhade, Dr. Amol Patil"
                placeholderTextColor={GlassColors.textMuted}
              />
            </View>

            {/* ── REVERT OR DELETE BUTTONS (IF MODIFIED OR EXTRA) ── */}
            {!isNewSlot && onRevert && (
              <Pressable
                onPress={() => setShowRevertConfirm(true)}
                style={({ pressed }) => [styles.revertBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="refresh-outline" size={16} color="#FBBF24" />
                <Text style={styles.revertBtnText}>Reset This Class to Original</Text>
              </Pressable>
            )}

            {!isNewSlot && onDelete && (
              <Pressable
                onPress={() => setShowDeleteConfirm(true)}
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                <Text style={styles.deleteBtnText}>Remove This Class From Schedule</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.footerCancelBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.footerCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleTriggerSave}
              style={({ pressed }) => [styles.footerSaveBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#050A15" />
              <Text style={styles.footerSaveText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>

        {/* ── CONFIRMATION MODALS ── */}
        <ConfirmModal
          visible={showSaveConfirm}
          title="Save Changes?"
          message="Are you sure you want to change this timetable session? Your schedule and widgets will be updated."
          confirmLabel="Yes, Update"
          cancelLabel="Keep Editing"
          iconName="help-circle-outline"
          onConfirm={handleConfirmedSave}
          onCancel={() => setShowSaveConfirm(false)}
        />

        <ConfirmModal
          visible={showRevertConfirm}
          title="Reset This Class?"
          message="Are you sure you want to undo your edits for this class and restore the default college schedule?"
          confirmLabel="Yes, Reset"
          confirmVariant="danger"
          iconName="arrow-undo-outline"
          onConfirm={handleConfirmedRevert}
          onCancel={() => setShowRevertConfirm(false)}
        />

        <ConfirmModal
          visible={showDeleteConfirm}
          title="Remove Class?"
          message="Are you sure you want to remove this class from today's schedule?"
          confirmLabel="Yes, Remove"
          confirmVariant="danger"
          iconName="trash-outline"
          onConfirm={handleConfirmedDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 18, 0.75)',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#070D1F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      web: {
        boxShadow: '0 -15px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.1)',
      } as any,
      default: GlassShadows.cardSoft,
    }),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerSuperText: {
    fontSize: 10,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: GlassColors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    maxHeight: 460,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    color: GlassColors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 11,
    color: GlassColors.textMuted,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: GlassColors.textPrimary,
    fontWeight: '600',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  typeCardLectureActive: {
    borderColor: GlassColors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  typeCardLabActive: {
    borderColor: GlassColors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  typeCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassColors.textSecondary,
    marginTop: 6,
  },
  typeCardSub: {
    fontSize: 10,
    color: GlassColors.textMuted,
    marginTop: 2,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: GlassColors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeSeparator: {
    paddingHorizontal: 10,
    paddingTop: 16,
  },
  presetsTrack: {
    gap: 8,
    paddingVertical: 4,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: GlassColors.cyan,
  },
  presetText: {
    fontSize: 11,
    color: GlassColors.textSecondary,
    fontWeight: '600',
  },
  presetTextActive: {
    color: GlassColors.cyan,
    fontWeight: '700',
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 6,
    marginBottom: 8,
  },
  revertBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: GlassColors.textSecondary,
  },
  footerSaveBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: GlassColors.cyan,
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.45)',
      } as any,
      default: GlassShadows.cyanGlow,
    }),
  },
  footerSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#050A15',
    letterSpacing: 0.5,
  },
});
