import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getWidgetScheduleData } from './widget-sync';
import { SmallTimetableWidget } from './SmallTimetableWidget';
import { BigTimetableWidget } from './BigTimetableWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetScheduleData();

      if (widgetInfo.widgetName === 'SmallTimetableWidget') {
        renderWidget(
          <SmallTimetableWidget
            ongoing={data.ongoing}
            next={data.next}
            hasUser={Boolean(data.user)}
            isSunday={data.isSunday}
          />
        );
      } else if (widgetInfo.widgetName === 'BigTimetableWidget') {
        renderWidget(
          <BigTimetableWidget
            slots={data.slots}
            ongoingSlot={data.ongoing}
            hasUser={Boolean(data.user)}
            isSunday={data.isSunday}
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
