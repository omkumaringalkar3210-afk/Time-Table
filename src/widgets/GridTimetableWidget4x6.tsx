import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { TimetableEntry } from '@/data/timetable-data';

interface GridTimetableWidget4x6Props {
  slots: TimetableEntry[];
  ongoingSlot: TimetableEntry | null;
  hasUser: boolean;
  isSunday: boolean;
  clockTime: string;
  clockDate: string;
  dayName: string; // e.g. "MONDAY"
}

/**
 * A perfect 4x6 2-column grid timetable widget matching the 4x5 native card layout,
 * optimized for taller 4x6 launcher grids with support for up to 8 sessions (4 rows × 2 cols).
 */
export function GridTimetableWidget4x6({
  slots,
  ongoingSlot,
  hasUser,
  isSunday,
  clockTime,
  clockDate,
  dayName,
}: GridTimetableWidget4x6Props) {
  /* ── No user set up ────────────────────────────────────────────── */
  if (!hasUser) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#050A15',
          borderRadius: 20,
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
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          padding: 10,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={clockTime}
          style={{ fontSize: 32, fontWeight: 'bold', color: '#16D9F5', textAlign: 'center' }}
        />
        <TextWidget
          text={isSunday ? 'SUNDAY • NO CLASSES' : clockDate}
          style={{ fontSize: 10, color: '#56657A', textAlign: 'center', marginTop: 4, letterSpacing: 1 }}
        />
      </FlexWidget>
    );
  }

  /* ── Grid layout (4 rows × 2 columns, up to 8 slots) ──────────── */
  const displaySlots = slots.filter((s) => s.type !== 'break').slice(0, 8);

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
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP"
    >
      {/* ── HEADER: Day name + live time ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          height: 34,
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
            fontSize: 15,
            color: '#56657A',
            marginLeft: 8,
          }}
        />
      </FlexWidget>

      {/* ── HEADER LINE ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 1,
          backgroundColor: '#153345',
          marginTop: 4,
          marginBottom: 8,
        }}
      />

      {/* ── CARD GRID (Up to 4 rows × 2 cols) ── */}
      {rows.map((row, rowIndex) => (
        <FlexWidget
          key={`row-${rowIndex}`}
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            flex: 1,
            marginBottom: rowIndex < rows.length - 1 ? 6 : 0,
          }}
        >
          {row.map((slot, colIndex) => {
            const isOngoing =
              ongoingSlot &&
              ongoingSlot.startTime === slot.startTime &&
              ongoingSlot.subject === slot.subject;

            const isLab = slot.type === 'lab';
            const isDoubt = slot.type === 'doubt' || slot.subject === 'Doubt Solving Session';

            // Clean subject name to prevent awkward line breaks in compact grid
            const subjectName = isDoubt
              ? 'DSS'
              : slot.subject.length > 10
                ? slot.subject.slice(0, 9) + '…'
                : slot.subject;

            // Type badge text: LAB, LEC, or LEC for doubt sessions
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
                  justifyContent: 'center',
                  backgroundColor: isOngoing ? '#0A1A2E' : '#0A0F1E',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginLeft: colIndex > 0 ? 4 : 0,
                  marginRight: colIndex === 0 ? 4 : 0,
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
                    text={subjectName}
                    style={{
                      fontSize: subjectName.length > 7 ? 14 : 16,
                      fontWeight: 'bold',
                      color: subjectColor,
                    }}
                  />
                  <TextWidget
                    text={typeText}
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: typeColor,
                    }}
                  />
                </FlexWidget>

                {/* Bottom row: Start time + optional room number */}
                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: 'match_parent',
                    marginTop: 4,
                  }}
                >
                  <TextWidget
                    text={slot.startTime}
                    style={{
                      fontSize: 12,
                      color: timeColor,
                    }}
                  />
                  {slot.room && slot.room !== '-' && (
                    <TextWidget
                      text={slot.room}
                      style={{
                        fontSize: 10,
                        color: isOngoing ? '#16D9F5' : '#56657A',
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </FlexWidget>
              </FlexWidget>
            );
          })}

          {/* Fill empty cell if row has only 1 slot */}
          {row.length === 1 && (
            <FlexWidget
              key={`empty-${rowIndex}`}
              style={{
                flex: 1,
                marginLeft: 4,
              }}
            />
          )}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
