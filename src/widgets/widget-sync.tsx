import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_USER_KEY, UserAccount } from '@/storage/preferences-storage';
import { TimetableService } from '@/services/timetable-service';
import { TimetableEntry, getSlotStatus } from '@/data/timetable-data';
import { SmallTimetableWidget } from './SmallTimetableWidget';
import { BigTimetableWidget } from './BigTimetableWidget';
import { MiniGridTimetableWidget } from './MiniGridTimetableWidget';

export interface WidgetScheduleData {
  user: UserAccount | null;
  slots: TimetableEntry[];
  ongoing: TimetableEntry | null;
  next: TimetableEntry | null;
  isSunday: boolean;
}

/** Formats the current time as HH:MM AM/PM and a short date string */
function getClockStrings(now: Date): { clockTime: string; clockDate: string; dayName: string } {
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const mm = minutes.toString().padStart(2, '0');
  const clockTime = `${hours12}:${mm} ${ampm}`;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = now.getDate().toString().padStart(2, '0');
  const clockDate = `${days[now.getDay()]}, ${dd} ${months[now.getMonth()]}`;
  const dayName = fullDays[now.getDay()];

  return { clockTime, clockDate, dayName };
}

/**
 * Reads user preferences and calculates today's accurate live schedule
 */
export async function getWidgetScheduleData(): Promise<WidgetScheduleData> {
  try {
    const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!raw) {
      return {
        user: null,
        slots: [],
        ongoing: null,
        next: null,
        isSunday: false,
      };
    }

    const user: UserAccount = JSON.parse(raw);
    const now = new Date();
    const dayNum = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

    if (dayNum === 0) {
      return {
        user,
        slots: [],
        ongoing: null,
        next: null,
        isSunday: true,
      };
    }

    const slots = TimetableService.getDayLectures(
      user.branchId,
      user.divisionId,
      user.subdivisionId,
      dayNum
    );

    const ongoing = slots.find((s) => getSlotStatus(s, now) === 'ongoing') || null;
    const upcoming = slots.filter((s) => getSlotStatus(s, now) === 'upcoming');
    const next = upcoming.length > 0 ? upcoming[0] : null;

    return {
      user,
      slots,
      ongoing,
      next,
      isSunday: false,
    };
  } catch (error) {
    console.warn('Error reading schedule for widget:', error);
    return {
      user: null,
      slots: [],
      ongoing: null,
      next: null,
      isSunday: false,
    };
  }
}

/**
 * Triggers an immediate refresh of both Android widgets on the home screen
 */
export async function syncWidgets(): Promise<void> {
  try {
    const data = await getWidgetScheduleData();
    const { clockTime, clockDate, dayName } = getClockStrings(new Date());

    await requestWidgetUpdate({
      widgetName: 'SmallTimetableWidget',
      renderWidget: () => (
        <SmallTimetableWidget
          ongoing={data.ongoing}
          next={data.next}
          hasUser={Boolean(data.user)}
          isSunday={data.isSunday}
          clockTime={clockTime}
          clockDate={clockDate}
        />
      ),
    });

    await requestWidgetUpdate({
      widgetName: 'BigTimetableWidget',
      renderWidget: () => (
        <BigTimetableWidget
          slots={data.slots}
          ongoingSlot={data.ongoing}
          hasUser={Boolean(data.user)}
          isSunday={data.isSunday}
          clockTime={clockTime}
          clockDate={clockDate}
          dayName={dayName}
        />
      ),
    });

    await requestWidgetUpdate({
      widgetName: 'MiniGridTimetableWidget',
      renderWidget: () => (
        <MiniGridTimetableWidget
          slots={data.slots}
          ongoingSlot={data.ongoing}
          hasUser={Boolean(data.user)}
          isSunday={data.isSunday}
          clockTime={clockTime}
          clockDate={clockDate}
          dayName={dayName}
        />
      ),
    });
  } catch (err) {
    // If running in development or outside native Android, ignore gracefully
    console.log('Widget update requested (ignored on unsupported platform):', err);
  }
}
