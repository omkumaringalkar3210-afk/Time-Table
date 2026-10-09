import { TimetableEntry, getDaySchedule } from '@/data/timetable-data';
import { storageGet, storageSet, storageRemove } from '@/storage/preferences-storage';

export const CUSTOM_TIMETABLE_STORAGE_KEY = 'campus_timetable_custom_overrides_v1';

// Format: Record<scheduleKey, Record<dayNum, TimetableEntry[]>>
type OverridesStore = Record<string, Record<number, TimetableEntry[]>>;

let _overridesCache: OverridesStore = {};
let _isInitialized = false;

/**
 * Builds a deterministic schedule key based on user and class selection
 */
export function buildScheduleKey(
  username?: string,
  branchId?: string,
  divisionId?: string,
  subdivisionId?: string
): string {
  const u = (username || 'student').trim().toLowerCase();
  const b = (branchId || '').trim().toUpperCase();
  const d = (divisionId || '').trim().toUpperCase();
  const s = (subdivisionId || '').trim().toUpperCase();
  return `${u}_${b}_${d}_${s}`;
}

/**
 * Ensures custom timetable overrides are loaded into memory cache
 */
export async function initCustomScheduleService(): Promise<void> {
  if (_isInitialized) return;
  try {
    const raw = await storageGet(CUSTOM_TIMETABLE_STORAGE_KEY);
    if (raw) {
      _overridesCache = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load custom timetable overrides:', e);
    _overridesCache = {};
  } finally {
    _isInitialized = true;
  }
}

/**
 * Synchronous read of custom day slots from memory cache
 */
export function getCustomDaySlots(
  scheduleKey: string,
  dayNum: number
): TimetableEntry[] | null {
  const userDays = _overridesCache[scheduleKey];
  if (!userDays || !userDays[dayNum]) return null;
  return userDays[dayNum];
}

/**
 * Returns whether any custom edits exist for this user schedule
 */
export function hasCustomOverrides(scheduleKey: string): boolean {
  const userDays = _overridesCache[scheduleKey];
  if (!userDays) return false;
  return Object.values(userDays).some((slots) => Array.isArray(slots) && slots.length > 0);
}

/**
 * Returns total count of customized days for this schedule
 */
export function countCustomDays(scheduleKey: string): number {
  const userDays = _overridesCache[scheduleKey];
  if (!userDays) return 0;
  return Object.keys(userDays).length;
}

/**
 * Checks whether an individual slot at slotIndex differs from default
 */
export function isSlotModified(
  currentSlot: TimetableEntry,
  defaultSlot?: TimetableEntry
): boolean {
  if (!defaultSlot) return true; // newly added slot
  return (
    currentSlot.subject.trim().toUpperCase() !== defaultSlot.subject.trim().toUpperCase() ||
    currentSlot.startTime.trim() !== defaultSlot.startTime.trim() ||
    currentSlot.endTime.trim() !== defaultSlot.endTime.trim() ||
    currentSlot.room.trim().toUpperCase() !== defaultSlot.room.trim().toUpperCase() ||
    currentSlot.teacher.trim() !== defaultSlot.teacher.trim() ||
    currentSlot.type !== defaultSlot.type
  );
}

/**
 * Saves an edit to an existing slot at slotIndex
 */
export async function saveSlotEdit(
  scheduleKey: string,
  dayNum: number,
  slotIndex: number,
  updatedSlot: TimetableEntry,
  baselineSlots: TimetableEntry[]
): Promise<void> {
  await initCustomScheduleService();

  if (!_overridesCache[scheduleKey]) {
    _overridesCache[scheduleKey] = {};
  }

  // Use existing override day list if available, otherwise clone baseline
  const currentDaySlots = _overridesCache[scheduleKey][dayNum]
    ? [..._overridesCache[scheduleKey][dayNum]]
    : [...baselineSlots];

  if (slotIndex >= 0 && slotIndex < currentDaySlots.length) {
    currentDaySlots[slotIndex] = { ...updatedSlot };
  } else {
    currentDaySlots.push({ ...updatedSlot });
  }

  _overridesCache[scheduleKey][dayNum] = currentDaySlots;
  await storageSet(CUSTOM_TIMETABLE_STORAGE_KEY, JSON.stringify(_overridesCache));
}

/**
 * Adds a new custom slot to a day schedule
 */
export async function addCustomSlot(
  scheduleKey: string,
  dayNum: number,
  newSlot: TimetableEntry,
  baselineSlots: TimetableEntry[]
): Promise<void> {
  await initCustomScheduleService();

  if (!_overridesCache[scheduleKey]) {
    _overridesCache[scheduleKey] = {};
  }

  const currentDaySlots = _overridesCache[scheduleKey][dayNum]
    ? [..._overridesCache[scheduleKey][dayNum]]
    : [...baselineSlots];

  currentDaySlots.push({ ...newSlot });
  _overridesCache[scheduleKey][dayNum] = currentDaySlots;
  await storageSet(CUSTOM_TIMETABLE_STORAGE_KEY, JSON.stringify(_overridesCache));
}

/**
 * Deletes a slot from a day schedule
 */
export async function deleteCustomSlot(
  scheduleKey: string,
  dayNum: number,
  slotIndex: number,
  baselineSlots: TimetableEntry[]
): Promise<void> {
  await initCustomScheduleService();

  if (!_overridesCache[scheduleKey]) {
    _overridesCache[scheduleKey] = {};
  }

  const currentDaySlots = _overridesCache[scheduleKey][dayNum]
    ? [..._overridesCache[scheduleKey][dayNum]]
    : [...baselineSlots];

  if (slotIndex >= 0 && slotIndex < currentDaySlots.length) {
    currentDaySlots.splice(slotIndex, 1);
  }

  _overridesCache[scheduleKey][dayNum] = currentDaySlots;
  await storageSet(CUSTOM_TIMETABLE_STORAGE_KEY, JSON.stringify(_overridesCache));
}

/**
 * Reverts a single slot at slotIndex back to its default value
 */
export async function revertSingleSlot(
  scheduleKey: string,
  dayNum: number,
  slotIndex: number,
  defaultSlots: TimetableEntry[]
): Promise<void> {
  await initCustomScheduleService();

  if (!_overridesCache[scheduleKey] || !_overridesCache[scheduleKey][dayNum]) {
    return;
  }

  const currentDaySlots = [..._overridesCache[scheduleKey][dayNum]];

  if (slotIndex < defaultSlots.length) {
    // Restore default slot
    currentDaySlots[slotIndex] = { ...defaultSlots[slotIndex] };
  } else {
    // If it was an added slot beyond default length, remove it
    currentDaySlots.splice(slotIndex, 1);
  }

  // Check if currentDaySlots is identical to defaultSlots
  const isIdentical =
    currentDaySlots.length === defaultSlots.length &&
    currentDaySlots.every((s, idx) => !isSlotModified(s, defaultSlots[idx]));

  if (isIdentical) {
    delete _overridesCache[scheduleKey][dayNum];
    if (Object.keys(_overridesCache[scheduleKey]).length === 0) {
      delete _overridesCache[scheduleKey];
    }
  } else {
    _overridesCache[scheduleKey][dayNum] = currentDaySlots;
  }

  await storageSet(CUSTOM_TIMETABLE_STORAGE_KEY, JSON.stringify(_overridesCache));
}

/**
 * Reverts ALL custom edits for this schedule, restoring the default timetable
 */
export async function revertAllCustomOverrides(scheduleKey: string): Promise<void> {
  await initCustomScheduleService();

  if (_overridesCache[scheduleKey]) {
    delete _overridesCache[scheduleKey];
    await storageSet(CUSTOM_TIMETABLE_STORAGE_KEY, JSON.stringify(_overridesCache));
  }
}

/**
 * Helper to build a clean TimetableEntry
 */
export function buildCustomSlotEntry(params: {
  subject: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'doubt';
  startTime: string; // e.g. "08:30 AM"
  endTime: string;   // e.g. "09:30 AM"
  room: string;
  teacher: string;
}): TimetableEntry {
  const { subject, type, startTime, endTime, room, teacher } = params;

  // Derive 24-hr time display "HH:MM – HH:MM"
  const to24 = (amPmStr: string) => {
    const parts = amPmStr.trim().split(/\s+/);
    const [hStr, mStr] = parts[0].split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    const isPm = (parts[1] || '').toUpperCase() === 'PM';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  let timeString = `${startTime} – ${endTime}`;
  try {
    timeString = `${to24(startTime)} – ${to24(endTime)}`;
  } catch {
    // fallback
  }

  const teacherTrimmed = teacher.trim();
  const teacherShort = teacherTrimmed
    ? teacherTrimmed.replace(/^(Dr\.|Mr\.|Ms\.|Prof\.)\s*/i, '').trim()
    : '';

  return {
    subject: subject.trim().toUpperCase() || 'UNNAMED CLASS',
    type,
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    time: timeString,
    room: room.trim() || '-',
    teacher: teacherTrimmed || '-',
    teacherShort: teacherShort || teacherTrimmed || '-',
  };
}
