import { TimetableEntry } from '@/data/timetable-data';
import { TimetableService } from '@/services/timetable-service';
import { storageGet, storageSet } from '@/storage/preferences-storage';

// ─── Storage Key ──────────────────────────────────────────────────────────────
export const ATTENDANCE_STORAGE_KEY = 'campus_attendance_data_v1';

// ─── Data Models ──────────────────────────────────────────────────────────────

export interface TrackedSubject {
  id: string;
  subjectName: string;
  classType: 'lecture' | 'lab';
  isTracked: boolean;
  customTarget?: number; // per-subject override; undefined = use global
  /** Manually imported historical totals (before using the app) */
  previousAttended: number;
  previousConducted: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'not_marked';

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;        // ISO date "2026-10-09"
  dayNum: number;      // 0=Sun … 6=Sat
  slotTime: string;    // "08:15 AM" — ties to a specific timetable slot
  status: AttendanceStatus;
  isManualHistory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStore {
  subjects: TrackedSubject[];
  records: AttendanceRecord[];
  setupComplete: boolean;
  lectureTarget: number;  // global default 75
  labTarget: number;      // global default 100
  lastUpdated: string;
}

// ─── Computed Stat Types ──────────────────────────────────────────────────────

export interface SubjectStats {
  subjectId: string;
  subjectName: string;
  classType: 'lecture' | 'lab';
  totalConducted: number;
  totalAttended: number;
  totalMissed: number;
  percentage: number;       // -1 when no classes conducted
  target: number;
  isMeetingTarget: boolean;
  classesNeededToReachTarget: number; // 0 if already meeting, -1 if impossible (100% lab)
  pendingCount: number;     // not_marked count
}

export interface OverallStats {
  /** combined using sum-of-attended / sum-of-conducted */
  overallPercentage: number;
  lecturePercentage: number;
  labPercentage: number;
  totalAttended: number;
  totalConducted: number;
  lectureAttended: number;
  lectureConducted: number;
  labAttended: number;
  labConducted: number;
  lectureTarget: number;
  labTarget: number;
  pendingCount: number;
}

// ─── Default Empty Store ──────────────────────────────────────────────────────

function makeEmptyStore(): AttendanceStore {
  return {
    subjects: [],
    records: [],
    setupComplete: false,
    lectureTarget: 75,
    labTarget: 100,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

let _cache: AttendanceStore | null = null;

export async function getAttendanceStore(): Promise<AttendanceStore> {
  if (_cache) return _cache;
  try {
    const raw = await storageGet(ATTENDANCE_STORAGE_KEY);
    if (raw) {
      _cache = JSON.parse(raw) as AttendanceStore;
      // Ensure fields exist (handle older schema)
      if (_cache!.lectureTarget === undefined) _cache!.lectureTarget = 75;
      if (_cache!.labTarget === undefined) _cache!.labTarget = 100;
      return _cache!;
    }
  } catch (e) {
    console.warn('Failed to load attendance store:', e);
  }
  _cache = makeEmptyStore();
  return _cache;
}

export async function saveAttendanceStore(store: AttendanceStore): Promise<void> {
  store.lastUpdated = new Date().toISOString();
  _cache = store;
  await storageSet(ATTENDANCE_STORAGE_KEY, JSON.stringify(store));
}

/** Invalidate in-memory cache so next read goes to disk */
export function invalidateAttendanceCache(): void {
  _cache = null;
}

// ─── Subject ID Generation ────────────────────────────────────────────────────

/**
 * Generate a stable, deterministic subject ID from name + type.
 * Same subject appearing multiple times in the weekly timetable produces
 * the same ID, preventing duplicates.
 */
export function makeSubjectId(name: string, classType: 'lecture' | 'lab'): string {
  const normalized = name.trim().toUpperCase().replace(/\s+/g, '_');
  return `sub_${normalized}_${classType}`;
}

// ─── Extract Unique Subjects from Timetable ───────────────────────────────────

export interface DetectedSubject {
  id: string;
  subjectName: string;
  classType: 'lecture' | 'lab';
  teachers: string[];
  rooms: string[];
  occurrences: number; // how many weekly slots
}

/**
 * Scans the full weekly timetable (Mon–Sat, days 1–6) and extracts
 * unique subjects with their auto-detected type. Includes custom
 * timetable modifications.
 */
export function extractUniqueSubjects(
  branchId: string,
  divisionId: string,
  subdivisionId: string,
  username?: string
): DetectedSubject[] {
  const seen = new Map<string, DetectedSubject>();

  for (let dayNum = 1; dayNum <= 6; dayNum++) {
    const slots = TimetableService.getDayLectures(
      branchId,
      divisionId,
      subdivisionId,
      dayNum,
      username
    );

    for (const slot of slots) {
      if (slot.type === 'break') continue;

      // Map timetable types to our two categories
      const classType: 'lecture' | 'lab' =
        slot.type === 'lab' ? 'lab' : 'lecture';

      // Doubt sessions use original subject if available
      const subjectName =
        slot.type === 'doubt' && slot.originalSubject
          ? slot.originalSubject
          : slot.subject;

      // Skip "Doubt Solving Session" as a subject name (it's a session type, not a subject)
      if (subjectName === 'Doubt Solving Session') continue;

      const id = makeSubjectId(subjectName, classType);

      if (seen.has(id)) {
        const existing = seen.get(id)!;
        existing.occurrences += 1;
        if (slot.teacher && slot.teacher !== '-' && !existing.teachers.includes(slot.teacher)) {
          existing.teachers.push(slot.teacher);
        }
        if (slot.room && slot.room !== '-' && !existing.rooms.includes(slot.room)) {
          existing.rooms.push(slot.room);
        }
      } else {
        seen.set(id, {
          id,
          subjectName: subjectName.trim().toUpperCase(),
          classType,
          teachers: slot.teacher && slot.teacher !== '-' ? [slot.teacher] : [],
          rooms: slot.room && slot.room !== '-' ? [slot.room] : [],
          occurrences: 1,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName)
  );
}

// ─── Setup / Subject Management ───────────────────────────────────────────────

/**
 * Initialize attendance tracking with selected subjects.
 * Called once during first-time setup.
 */
export async function setupAttendance(
  selectedSubjects: { id: string; subjectName: string; classType: 'lecture' | 'lab' }[]
): Promise<void> {
  const store = await getAttendanceStore();

  const subjects: TrackedSubject[] = selectedSubjects.map((s) => ({
    id: s.id,
    subjectName: s.subjectName,
    classType: s.classType,
    isTracked: true,
    previousAttended: 0,
    previousConducted: 0,
  }));

  store.subjects = subjects;
  store.setupComplete = true;
  await saveAttendanceStore(store);
}

/**
 * Add a new manually-created subject to the tracker.
 */
export async function addManualSubject(
  subjectName: string,
  classType: 'lecture' | 'lab'
): Promise<TrackedSubject> {
  const store = await getAttendanceStore();
  const id = makeSubjectId(subjectName, classType);

  // Prevent duplicate
  const existing = store.subjects.find((s) => s.id === id);
  if (existing) {
    existing.isTracked = true;
    await saveAttendanceStore(store);
    return existing;
  }

  const subject: TrackedSubject = {
    id,
    subjectName: subjectName.trim().toUpperCase(),
    classType,
    isTracked: true,
    previousAttended: 0,
    previousConducted: 0,
  };

  store.subjects.push(subject);
  await saveAttendanceStore(store);
  return subject;
}

/**
 * Remove (untrack) a subject. Records are kept for safety.
 */
export async function removeSubject(subjectId: string): Promise<void> {
  const store = await getAttendanceStore();
  const subj = store.subjects.find((s) => s.id === subjectId);
  if (subj) {
    subj.isTracked = false;
    await saveAttendanceStore(store);
  }
}

// ─── Attendance Record CRUD ───────────────────────────────────────────────────

/**
 * Build a unique record ID from subject + date + slot to prevent duplicates.
 */
export function buildRecordId(subjectId: string, date: string, slotTime: string): string {
  return `${subjectId}__${date}__${slotTime.replace(/\s+/g, '')}`;
}

/**
 * Mark attendance for a specific class occurrence.
 * Creates a new record or updates an existing one.
 */
export async function markAttendance(params: {
  subjectId: string;
  date: string;
  dayNum: number;
  slotTime: string;
  status: AttendanceStatus;
  isManualHistory?: boolean;
}): Promise<void> {
  const store = await getAttendanceStore();
  const recordId = buildRecordId(params.subjectId, params.date, params.slotTime);
  const now = new Date().toISOString();

  const existingIdx = store.records.findIndex((r) => r.id === recordId);

  if (existingIdx >= 0) {
    // Update existing record
    store.records[existingIdx].status = params.status;
    store.records[existingIdx].updatedAt = now;
  } else {
    // Create new record
    store.records.push({
      id: recordId,
      subjectId: params.subjectId,
      date: params.date,
      dayNum: params.dayNum,
      slotTime: params.slotTime,
      status: params.status,
      isManualHistory: params.isManualHistory || false,
      createdAt: now,
      updatedAt: now,
    });
  }

  await saveAttendanceStore(store);
}

/**
 * Get all records for a specific subject, sorted by date descending.
 */
export function getSubjectRecords(
  store: AttendanceStore,
  subjectId: string
): AttendanceRecord[] {
  return store.records
    .filter((r) => r.subjectId === subjectId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.slotTime.localeCompare(a.slotTime));
}

/**
 * Get attendance records for a specific date.
 */
export function getDateRecords(
  store: AttendanceStore,
  date: string
): AttendanceRecord[] {
  return store.records.filter((r) => r.date === date);
}

// ─── Previous / Historical Attendance Import ──────────────────────────────────

/**
 * Import previous attendance totals for a subject.
 * Validates that attended ≤ conducted and both are non-negative.
 */
export async function importPreviousAttendance(
  subjectId: string,
  totalConducted: number,
  totalAttended: number
): Promise<{ success: boolean; error?: string }> {
  if (totalConducted < 0 || totalAttended < 0) {
    return { success: false, error: 'Values must be non-negative.' };
  }
  if (!Number.isInteger(totalConducted) || !Number.isInteger(totalAttended)) {
    return { success: false, error: 'Values must be whole numbers.' };
  }
  if (totalAttended > totalConducted) {
    return { success: false, error: 'Attended cannot exceed total conducted.' };
  }

  const store = await getAttendanceStore();
  const subj = store.subjects.find((s) => s.id === subjectId);
  if (!subj) {
    return { success: false, error: 'Subject not found.' };
  }

  subj.previousConducted = totalConducted;
  subj.previousAttended = totalAttended;
  await saveAttendanceStore(store);
  return { success: true };
}

// ─── Statistics Calculation ───────────────────────────────────────────────────

/**
 * Calculate attendance stats for a single subject.
 * Combines imported historical totals with individual records.
 */
export function getSubjectStats(
  store: AttendanceStore,
  subjectId: string
): SubjectStats | null {
  const subj = store.subjects.find((s) => s.id === subjectId && s.isTracked);
  if (!subj) return null;

  // Count finalized records (present/absent only; not_marked and cancelled don't count)
  const records = store.records.filter((r) => r.subjectId === subjectId);
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const pendingCount = records.filter((r) => r.status === 'not_marked').length;

  // Combine with historical imports
  const totalAttended = subj.previousAttended + presentCount;
  const totalConducted = subj.previousConducted + presentCount + absentCount;
  const totalMissed = totalConducted - totalAttended;

  const percentage = totalConducted > 0
    ? Math.round((totalAttended / totalConducted) * 10000) / 100
    : -1;

  // Determine target
  const target = subj.customTarget !== undefined
    ? subj.customTarget
    : (subj.classType === 'lab' ? store.labTarget : store.lectureTarget);

  const isMeetingTarget = percentage >= target;

  // Calculate consecutive classes needed to reach target
  let classesNeeded = 0;
  if (percentage >= 0 && !isMeetingTarget) {
    if (target >= 100) {
      // Can never recover 100% once missed
      classesNeeded = -1;
    } else {
      // Formula: ceil((target * conducted - 100 * attended) / (100 - target))
      const numerator = (target * totalConducted) - (100 * totalAttended);
      const denominator = 100 - target;
      classesNeeded = Math.max(0, Math.ceil(numerator / denominator));
    }
  }

  return {
    subjectId: subj.id,
    subjectName: subj.subjectName,
    classType: subj.classType,
    totalConducted,
    totalAttended,
    totalMissed,
    percentage,
    target,
    isMeetingTarget,
    classesNeededToReachTarget: classesNeeded,
    pendingCount,
  };
}

/**
 * Calculate overall stats across all tracked subjects.
 * Uses sum-of-attended / sum-of-conducted (not averaged percentages).
 */
export function getOverallStats(store: AttendanceStore): OverallStats {
  let totalAttended = 0;
  let totalConducted = 0;
  let lectureAttended = 0;
  let lectureConducted = 0;
  let labAttended = 0;
  let labConducted = 0;
  let pendingCount = 0;

  for (const subj of store.subjects) {
    if (!subj.isTracked) continue;

    const stats = getSubjectStats(store, subj.id);
    if (!stats) continue;

    totalAttended += stats.totalAttended;
    totalConducted += stats.totalConducted;
    pendingCount += stats.pendingCount;

    if (subj.classType === 'lecture') {
      lectureAttended += stats.totalAttended;
      lectureConducted += stats.totalConducted;
    } else {
      labAttended += stats.totalAttended;
      labConducted += stats.totalConducted;
    }
  }

  return {
    overallPercentage: totalConducted > 0
      ? Math.round((totalAttended / totalConducted) * 10000) / 100
      : -1,
    lecturePercentage: lectureConducted > 0
      ? Math.round((lectureAttended / lectureConducted) * 10000) / 100
      : -1,
    labPercentage: labConducted > 0
      ? Math.round((labAttended / labConducted) * 10000) / 100
      : -1,
    totalAttended,
    totalConducted,
    lectureAttended,
    lectureConducted,
    labAttended,
    labConducted,
    lectureTarget: store.lectureTarget,
    labTarget: store.labTarget,
    pendingCount,
  };
}

// ─── Target Management ────────────────────────────────────────────────────────

export async function updateGlobalTargets(
  lectureTarget: number,
  labTarget: number
): Promise<void> {
  const store = await getAttendanceStore();
  store.lectureTarget = Math.max(0, Math.min(100, lectureTarget));
  store.labTarget = Math.max(0, Math.min(100, labTarget));
  await saveAttendanceStore(store);
}

export async function updateSubjectTarget(
  subjectId: string,
  target: number | undefined
): Promise<void> {
  const store = await getAttendanceStore();
  const subj = store.subjects.find((s) => s.id === subjectId);
  if (subj) {
    subj.customTarget = target;
    await saveAttendanceStore(store);
  }
}

// ─── Reminder Helpers ─────────────────────────────────────────────────────────

/**
 * Counts how many of today's scheduled classes have no attendance record yet.
 */
export async function getTodayPendingCount(
  branchId: string,
  divisionId: string,
  subdivisionId: string,
  username?: string
): Promise<number> {
  const store = await getAttendanceStore();
  if (!store.setupComplete) return 0;

  const now = new Date();
  const dayNum = now.getDay();
  if (dayNum === 0) return 0; // Sunday

  const today = now.toISOString().split('T')[0];
  const todayRecords = getDateRecords(store, today);
  const slots = TimetableService.getDayLectures(branchId, divisionId, subdivisionId, dayNum, username);

  let pending = 0;
  for (const slot of slots) {
    if (slot.type === 'break') continue;

    // Resolve the subject name for lookup
    const subjectName = slot.type === 'doubt' && slot.originalSubject
      ? slot.originalSubject
      : slot.subject;
    if (subjectName === 'Doubt Solving Session') continue;

    const classType: 'lecture' | 'lab' = slot.type === 'lab' ? 'lab' : 'lecture';
    const subjectId = makeSubjectId(subjectName, classType);

    // Only count if this subject is being tracked
    const isTracked = store.subjects.some((s) => s.id === subjectId && s.isTracked);
    if (!isTracked) continue;

    // Check if a record exists for this slot today
    const hasRecord = todayRecords.some(
      (r) => r.subjectId === subjectId && r.slotTime === slot.startTime
    );
    if (!hasRecord) pending++;
  }

  return pending;
}

/**
 * Determines if all today's classes have ended (for reminder display).
 */
export function haveAllClassesEnded(
  branchId: string,
  divisionId: string,
  subdivisionId: string,
  username?: string
): boolean {
  const now = new Date();
  const dayNum = now.getDay();
  if (dayNum === 0) return false;

  const slots = TimetableService.getDayLectures(branchId, divisionId, subdivisionId, dayNum, username);
  const nonBreaks = slots.filter((s) => s.type !== 'break');
  if (nonBreaks.length === 0) return false;

  return nonBreaks.every((s) => TimetableService.getSlotStatus(s, now) === 'ended');
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export async function resetAttendanceData(): Promise<void> {
  _cache = makeEmptyStore();
  await saveAttendanceStore(_cache);
}
