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

/** A compact 2-column grid widget matching the native XML card layout */
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
          backgroundColor: '#050A15',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Open app to set your timetable"
          style={{ fontSize: 11, color: '#16D9F5', textAlign: 'center', fontWeight: 'bold' }}
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
          backgroundColor: '#050A15',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={clockTime}
          style={{ fontSize: 28, fontWeight: 'bold', color: '#16D9F5', textAlign: 'center' }}
        />
        <TextWidget
          text={isSunday ? 'SUNDAY • NO CLASSES' : clockDate}
          style={{ fontSize: 9, color: '#56657A', textAlign: 'center', marginTop: 4, letterSpacing: 1 }}
        />
      </FlexWidget>
    );
  }

  /* ── Grid layout ───────────────────────────────────────────────── */
  // Limit to 6 slots max (3 rows × 2 columns)
  const displaySlots = slots.filter((s) => s.type !== 'break').slice(0, 6);

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
        backgroundColor: '#050A15',
        borderRadius: 16,
        padding: 0,
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP"
    >
      {/* ── HEADER: Day name + live time ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          height: 48,
        }}
      >
        <TextWidget
          text={dayName}
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#16D9F5',
            letterSpacing: 1.5,
          }}
        />
        <TextWidget
          text={clockTime}
          style={{
            fontSize: 16,
            color: '#56657A',
            marginLeft: 5,
          }}
        />
      </FlexWidget>

      {/* ── HEADER LINE ── */}
      <FlexWidget
        style={{
          width: 340,
          height: 1,
          backgroundColor: '#153345',
          marginLeft: 12,
        }}
      />

      {/* ── SPACER ── */}
      <FlexWidget style={{ height: 12 }} />

      {/* ── CARD GRID (3 rows × 2 cols) ── */}
      {rows.map((row, rowIndex) => (
        <FlexWidget
          key={`row-${rowIndex}`}
          style={{
            flexDirection: 'row',
            flex: 1,
            marginBottom: rowIndex < rows.length - 1 ? 0 : 0,
          }}
        >
          {row.map((slot, colIndex) => {
            const isOngoing =
              ongoingSlot &&
              ongoingSlot.startTime === slot.startTime &&
              ongoingSlot.subject === slot.subject;

            const isLab = slot.type === 'lab';

            // Type badge text
            const typeText = isLab ? 'LAB' : 'LEC';
            // Type badge color: green for LAB, cyan for LEC
            const typeColor = isLab ? '#39D98A' : '#19BFEF';
            // Subject color: cyan if ongoing, white otherwise
            const subjectColor = isOngoing ? '#19D9F5' : '#FFFFFF';
            // Time color: highlighted if ongoing, dim otherwise
            const timeColor = isOngoing ? '#71BBD4' : '#718099';

            return (
              <FlexWidget
                key={`slot-${rowIndex}-${colIndex}`}
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  backgroundColor: isOngoing ? '#0A1A2E' : '#0A0F1E',
                  borderRadius: 12,
                  padding: 12,
                  marginLeft: colIndex > 0 ? 0 : 0,
                  borderWidth: 1,
                  borderColor: isOngoing ? '#16D9F544' : '#111827',
                }}
              >
                {/* Top row: Subject name + Type badge */}
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
                      fontSize: 17,
                      fontWeight: 'bold',
                      color: subjectColor,
                    }}
                  />
                  <TextWidget
                    text={typeText}
                    style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: typeColor,
                    }}
                  />
                </FlexWidget>

                {/* Start time */}
                <TextWidget
                  text={slot.startTime}
                  style={{
                    fontSize: 13,
                    color: timeColor,
                    marginTop: 6,
                  }}
                />
              </FlexWidget>
            );
          })}

          {/* Fill empty cell if row has only 1 slot */}
          {row.length === 1 && (
            <FlexWidget
              key={`empty-${rowIndex}`}
              style={{ flex: 1 }}
            />
          )}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
