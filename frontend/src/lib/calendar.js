import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

// Module-level constants so the plugins array keeps the same reference across
// re-renders. FullCalendar's Vue wrapper re-registers plugins whenever the
// `plugins` array identity changes, which crashes ("Class constructor ...
// cannot be invoked without 'new'") if it happens after the calendar already
// mounted (e.g. every time a computed `options` object is recreated).
export const CALENDAR_PLUGINS = [dayGridPlugin, timeGridPlugin];
export const CALENDAR_PLUGINS_DAY_ONLY = [dayGridPlugin];
