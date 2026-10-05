import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getWidgetScheduleData } from './widget-sync';
import { SmallTimetableWidget } from './SmallTimetableWidget';
import { BigTimetableWidget } from './BigTimetableWidget';

function getClockStrings(now: Date): { clockTime: string; clockDate: string } {
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const mm = minutes.toString().padStart(2, '0');
  const clockTime = `${hours12}:${mm} ${ampm}`;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = now.getDate().toString().padStart(2, '0');
  const clockDate = `${days[now.getDay()]}, ${dd} ${months[now.getMonth()]}`;

  return { clockTime, clockDate };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetScheduleData();
      const { clockTime, clockDate } = getClockStrings(new Date());

      if (widgetInfo.widgetName === 'SmallTimetableWidget') {
        renderWidget(
          <SmallTimetableWidget
            ongoing={data.ongoing}
            next={data.next}
            hasUser={Boolean(data.user)}
            isSunday={data.isSunday}
            clockTime={clockTime}
            clockDate={clockDate}
          />
        );
      } else if (widgetInfo.widgetName === 'BigTimetableWidget') {
        renderWidget(
          <BigTimetableWidget
            slots={data.slots}
            ongoingSlot={data.ongoing}
            hasUser={Boolean(data.user)}
            isSunday={data.isSunday}
            clockTime={clockTime}
            clockDate={clockDate}
          />
        );
      }
      break;
    }

    case 'WIDGET_DELETED':
      // No cleanup needed
      break;

    case 'WIDGET_CLICK':
      // The default clickAction 'OPEN_APP' handles opening the app automatically
      break;

    default:
      break;
  }
}
