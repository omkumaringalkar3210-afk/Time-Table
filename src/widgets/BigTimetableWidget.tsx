import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { TimetableEntry } from '@/data/timetable-data';

interface BigTimetableWidgetProps {
  slots: TimetableEntry[];
  ongoingSlot: TimetableEntry | null;
  hasUser: boolean;
  isSunday: boolean;
  clockTime: string;
  clockDate: string;
  dayName: string; // e.g. "MONDAY"
}

export function BigTimetableWidget({
  slots,
  ongoingSlot,
  hasUser,
  isSunday,
  clockTime,
  clockDate,
  dayName,
}: BigTimetableWidgetProps) {
  if (!hasUser) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#070B18',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1E293B',
          padding: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Open app to set your timetable"
          style={{
            fontSize: 14,
            color: '#38BDF8',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    );
  }

  if (isSunday || slots.length === 0) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#070B18',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1E293B',
          padding: 20,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
        clickAction="OPEN_APP"
      >
        {/* Digital Clock */}
        <TextWidget
          text={clockTime}
          style={{
            fontSize: 42,
            fontWeight: 'bold',
            color: '#00E5FF',
            textAlign: 'center',
            letterSpacing: 2,
          }}
        />
        {/* Date */}
        <TextWidget
          text={clockDate}
          style={{
            fontSize: 14,
            color: '#64748B',
            textAlign: 'center',
            marginTop: 6,
            letterSpacing: 1,
          }}
        />
        {isSunday && (
          <TextWidget
            text="SUNDAY • NO CLASSES"
            style={{
              fontSize: 10,
              color: '#334155',
              textAlign: 'center',
              marginTop: 10,
              fontWeight: 'bold',
              letterSpacing: 2,
            }}
          />
        )}
      </FlexWidget>
    );
  }

  // Display all classes for today (up to 7 max to guarantee clear rendering without overflow)
  const displaySlots = slots.slice(0, 7);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#070B18',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#00E5FF33',
        padding: 10,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Day header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 4,
          paddingBottom: 6,
          marginBottom: 2,
          borderBottomWidth: 1,
          borderBottomColor: '#00E5FF22',
        }}
      >
        <TextWidget
          text={dayName}
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#00E5FF',
            letterSpacing: 2,
          }}
        />
        <TextWidget
          text={clockDate}
          style={{
            fontSize: 10,
            color: '#334155',
            letterSpacing: 1,
          }}
        />
      </FlexWidget>

      {displaySlots.map((slot, index) => {
        const isOngoing =
          ongoingSlot &&
          ongoingSlot.startTime === slot.startTime &&
          ongoingSlot.subject === slot.subject;

        return (
          <FlexWidget
            key={`slot-${index}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: isOngoing ? '#0F1E36' : '#0B132B',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 7,
              marginVertical: 2,
              borderWidth: 1,
              borderColor: isOngoing ? '#00E5FF' : '#1E293B',
            }}
          >
            {/* Class Time */}
            <TextWidget
              text={`${slot.startTime} – ${slot.endTime}`}
              style={{
                fontSize: 11,
                color: isOngoing ? '#38BDF8' : '#94A3B8',
                fontWeight: isOngoing ? '600' : 'normal',
              }}
            />

            {/* Class Name */}
            <TextWidget
              text={slot.subject}
              style={{
                fontSize: 13,
                fontWeight: 'bold',
                color: isOngoing ? '#00E5FF' : '#FFFFFF',
              }}
            />

            {/* Class Type: LECTURE or LAB */}
            <TextWidget
              text={slot.type === 'lab' ? 'LAB' : 'LECTURE'}
              style={{
                fontSize: 9,
                fontWeight: 'bold',
                color: slot.type === 'lab' ? '#10B981' : '#38BDF8',
              }}
            />
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
