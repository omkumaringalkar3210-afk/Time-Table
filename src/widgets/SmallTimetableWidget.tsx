import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { TimetableEntry } from '@/data/timetable-data';

interface SmallTimetableWidgetProps {
  ongoing: TimetableEntry | null;
  next: TimetableEntry | null;
  hasUser: boolean;
  isSunday: boolean;
}

export function SmallTimetableWidget({
  ongoing,
  next,
  hasUser,
  isSunday,
}: SmallTimetableWidgetProps) {
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
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Open app to set your timetable"
          style={{
            fontSize: 13,
            color: '#38BDF8',
            textAlign: 'center',
            fontWeight: '600',
          }}
        />
      </FlexWidget>
    );
  }

  if (isSunday) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#070B18',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1E293B',
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Sunday • No Classes"
          style={{
            fontSize: 14,
            color: '#94A3B8',
            textAlign: 'center',
            fontWeight: '600',
          }}
        />
      </FlexWidget>
    );
  }

  if (!ongoing && !next) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#070B18',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1E293B',
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="All classes completed today"
          style={{
            fontSize: 14,
            color: '#10B981',
            textAlign: 'center',
            fontWeight: '600',
          }}
        />
      </FlexWidget>
    );
  }

  // If there's no ongoing class right now, promote next class to top slot
  const primary = ongoing || next;
  const secondary = ongoing ? next : null;

  const isPrimaryOngoing = Boolean(ongoing);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#070B18',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#00E5FF33',
        padding: 12,
        justifyContent: 'space-between',
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP"
    >
      {/* Primary slot: Ongoing or Upcoming */}
      {primary && (
        <FlexWidget
          style={{
            flexDirection: 'column',
            backgroundColor: isPrimaryOngoing ? '#0F1E36' : '#0B132B',
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: isPrimaryOngoing ? '#00E5FF' : '#1E293B',
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
            }}
          >
            <TextWidget
              text={primary.subject}
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: isPrimaryOngoing ? '#00E5FF' : '#FFFFFF',
              }}
            />
            <TextWidget
              text={primary.type === 'lab' ? 'LAB' : 'LECTURE'}
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: primary.type === 'lab' ? '#10B981' : '#38BDF8',
              }}
            />
          </FlexWidget>

          <TextWidget
            text={`${primary.startTime} – ${primary.endTime}`}
            style={{
              fontSize: 11,
              color: '#94A3B8',
              marginTop: 4,
            }}
          />
        </FlexWidget>
      )}

      {/* Secondary slot: Next class */}
      {secondary ? (
        <FlexWidget
          style={{
            flexDirection: 'column',
            backgroundColor: '#0B132B',
            borderRadius: 12,
            padding: 10,
            marginTop: 8,
            borderWidth: 1,
            borderColor: '#1E293B',
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
            }}
          >
            <TextWidget
              text={secondary.subject}
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            />
            <TextWidget
              text={secondary.type === 'lab' ? 'LAB' : 'LECTURE'}
              style={{
                fontSize: 9,
                fontWeight: 'bold',
                color: secondary.type === 'lab' ? '#10B981' : '#38BDF8',
              }}
            />
          </FlexWidget>

          <TextWidget
            text={`${secondary.startTime} – ${secondary.endTime}`}
            style={{
              fontSize: 10,
              color: '#64748B',
              marginTop: 3,
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            padding: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={ongoing ? 'Last class of the day' : ''}
            style={{
              fontSize: 11,
              color: '#64748B',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
