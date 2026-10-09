import {
  TIMETABLE_BRANCHES,
  BranchData,
  DivisionSchedule,
  BatchSchedule,
  DaySchedule,
  TimetableEntry,
  getDivisionSchedule,
  getDaySchedule,
  getSlotStatus,
  getTodayLiveSchedule,
} from '@/data/timetable-data';
import {
  initCustomScheduleService,
  getCustomDaySlots,
  buildScheduleKey,
} from '@/services/custom-timetable-service';

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  emoji: string;
  color: string;
}

export interface DivisionOption {
  id: string;
  code: string;
  name: string;
  batchesCount: number;
}

export interface SubdivisionOption {
  id: string;
  code: string;
  name: string;
}

export const TimetableService = {
  /**
   * Retrieves all available engineering branches from actual timetable data
   */
  getBranches(): BranchOption[] {
    return TIMETABLE_BRANCHES.map((b) => ({
      id: b.branchId,
      code: b.branchCode,
      name: b.branchLabel,
      emoji: b.emoji,
      color: b.color,
    }));
  },

  /**
   * Dynamically retrieves actual available divisions for the selected branch
   */
  getDivisionsForBranch(branchId: string): DivisionOption[] {
    const branch = TIMETABLE_BRANCHES.find(
      (b) => b.branchId === branchId || b.branchCode === branchId
    );
    if (!branch) return [];

    return branch.divisions.map((d) => ({
      id: d.divisionId,
      code: d.divisionId,
      name: d.divisionLabel,
      batchesCount: d.batches.length,
    }));
  },

  /**
   * Dynamically retrieves actual available subdivisions/batches for selected division
   */
  getSubdivisions(branchId: string, divisionId: string): SubdivisionOption[] {
    const branch = TIMETABLE_BRANCHES.find(
      (b) => b.branchId === branchId || b.branchCode === branchId
    );
    if (!branch) return [];

    let div = branch.divisions.find((d) => d.divisionId === divisionId);
    if (!div && branch.divisions.length > 0) {
      div = branch.divisions[0];
    }
    if (!div) return [];

    return div.batches.map((batch) => {
      // Extract numeric suffix if any (e.g., M1 -> 1, J2 -> 2)
      const numOnly = batch.batchId.replace(/\D/g, '') || batch.batchId;
      return {
        id: batch.batchId,
        code: numOnly,
        name: batch.batchLabel,
      };
    });
  },

  /**
   * Retrieves full week schedule for the chosen branch, division and subdivision
   */
  getWeekSchedule(
    branchId: string,
    divisionId: string,
    subdivisionId: string
  ): DaySchedule[] {
    return getDivisionSchedule(branchId, divisionId, subdivisionId) || [];
  },

  /**
   * Retrieves default (official) lectures for a specific day without user overrides
   */
  getDefaultDayLectures(
    branchId: string,
    divisionId: string,
    subdivisionId: string,
    dayNum: number
  ): TimetableEntry[] {
    const day = getDaySchedule(branchId, divisionId, subdivisionId, dayNum);
    return day?.slots.filter((s) => s.type !== 'break') || [];
  },

  /**
   * Retrieves lectures for a specific day (1=Monday ... 6=Saturday), incorporating user edits if any
   */
  getDayLectures(
    branchId: string,
    divisionId: string,
    subdivisionId: string,
    dayNum: number,
    username?: string
  ): TimetableEntry[] {
    // Check if user has custom edited slots for this day
    const scheduleKey = buildScheduleKey(username, branchId, divisionId, subdivisionId);
    const custom = getCustomDaySlots(scheduleKey, dayNum);
    if (custom) {
      return custom.filter((s) => s.type !== 'break');
    }

    const day = getDaySchedule(branchId, divisionId, subdivisionId, dayNum);
    return day?.slots.filter((s) => s.type !== 'break') || [];
  },

  /**
   * Computes live lecture status right now, with custom overrides applied
   */
  getLiveDashboard(
    branchId: string,
    divisionId: string,
    subdivisionId: string,
    username?: string
  ) {
    const now = new Date();
    const dayNum = now.getDay();
    const effectiveDay = dayNum === 0 ? 1 : dayNum;

    const lectures = this.getDayLectures(
      branchId,
      divisionId,
      subdivisionId,
      effectiveDay,
      username
    );
    if (!lectures || lectures.length === 0) return { ongoing: null, upcoming: [], ended: [] };

    const ongoing = lectures.find((s) => getSlotStatus(s, now) === 'ongoing') || null;
    const upcoming = lectures.filter((s) => getSlotStatus(s, now) === 'upcoming');
    const ended = lectures.filter((s) => getSlotStatus(s, now) === 'ended');

    return { ongoing, upcoming, ended };
  },

  /**
   * Get single slot status: 'ongoing' | 'upcoming' | 'ended'
   */
  getSlotStatus(slot: TimetableEntry, currentTime: Date = new Date()) {
    return getSlotStatus(slot, currentTime);
  },
};

// Eager initialization of custom overrides cache
initCustomScheduleService();

