import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { TimetableEntry } from '@/data/timetable-data';

interface MiniGridTimetableWidgetProps {
  slots: TimetableEntry[];
  ongoingSlot: TimetableEntry | null;
  hasUser: boolean;
  isSunday: boolean;
  clockTime: string;
  clockDate: string;
  dayName: string; // e.g. "MONDAY"
}

/** A compact 2-column grid widget — smallest possible footprint */
export function MiniGridTimetableWidget({
  slots,
  ongoingSlot,
  hasUser,
  isSunday,
  clockTime,
  clockDate,
  dayName,
}: MiniGridTimetableWidgetProps) {
  /* ── No user set up ────────────────────────────────────────────── */
  if (!hasUser) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#070B18',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#1E293B',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Open app to set your timetable"
          style={{ fontSize: 11, color: '#38BDF8', textAlign: 'center', fontWeight: 'bold' }}
        />
      </FlexWidget>
    );
  }

  /* ── Sunday / no classes ───────────────────────────────────────── */
  if (isSunday || slots.length === 0) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#070B18',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#1E293B',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={clockTime}
          style={{ fontSize: 28, fontWeight: 'bold', color: '#00E5FF', textAlign: 'center' }}
        />
        <TextWidget
          text={isSunday ? 'SUNDAY • NO CLASSES' : clockDate}
          style={{ fontSize: 9, color: '#475569', textAlign: 'center', marginTop: 4, letterSpacing: 1 }}
        />
      </FlexWidget>
    );
  }

  /* ── Grid layout ───────────────────────────────────────────────── */
  // Limit to 6 slots max so it fits in the smallest practical widget size
  const displaySlots = slots.slice(0, 6);

  // Split into rows of 2
  const rows: TimetableEntry[][] = [];
  for (let i = 0; i < displaySlots.length; i += 2) {
    rows.push(displaySlots.slice(i, i + 2));
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#070B18',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#00E5FF22',
        padding: 6,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* ── Compact header: day + time ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 2,
          paddingBottom: 4,
          marginBottom: 2,
          borderBottomWidth: 1,
          borderBottomColor: '#00E5FF18',
        }}
      >
        <TextWidget
          text={dayName}
          style={{ fontSize: 9, fontWeight: 'bold', color: '#00E5FF', letterSpacing: 1.5 }}
        />
        <TextWidget
          text={clockTime}
          style={{ fontSize: 9, color: '#334155', letterSpacing: 0.5 }}
        />
      </FlexWidget>

      {rows.map((row, rowIndex) => (
        <FlexWidget
          key={`row-${rowIndex}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            flex: 1,
            marginBottom: rowIndex < rows.length - 1 ? 4 : 0,
          }}
        >
          {row.map((slot, colIndex) => {
            const isOngoing =
              ongoingSlot &&
              ongoingSlot.startTime === slot.startTime &&
              ongoingSlot.subject === slot.subject;

            const isLab = slot.type === 'lab';

            return (
              <FlexWidget
                key={`slot-${rowIndex}-${colIndex}`}
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  backgroundColor: isOngoing ? '#0D1F3A' : '#0B1128',
                  borderRadius: 10,
                  padding: 7,
                  marginLeft: colIndex > 0 ? 4 : 0,
                  borderWidth: 1,
                  borderColor: isOngoing ? '#00E5FF' : '#1E2D45',
                }}
              >
                {/* Subject + Type badge */}
                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: 'match_parent',
                  }}
                >
                  <TextWidget
                    text={slot.subject}
                    style={{
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: isOngoing ? '#00E5FF' : '#FFFFFF',
                    }}
                  />
                  <TextWidget
                    text={isLab ? 'LAB' : 'LEC'}
                    style={{
                      fontSize: 8,
                      fontWeight: 'bold',
                      color: isLab ? '#10B981' : '#38BDF8',
                    }}
                  />
                </FlexWidget>

                {/* Time range */}
                <TextWidget
                  text={`${slot.startTime} – ${slot.endTime}`}
                  style={{
                    fontSize: 9,
                    color: isOngoing ? '#7DD3FC' : '#475569',
                    marginTop: 3,
                  }}
                />
              </FlexWidget>
            );
          })}

          {/* Fill empty cell if row has only 1 slot */}
          {row.length === 1 && (
            <FlexWidget
              key={`empty-${rowIndex}`}
              style={{ flex: 1, marginLeft: 4 }}
            />
          )}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
