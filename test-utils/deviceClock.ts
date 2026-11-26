import type { Calendar } from "expo-localization";

/**
 * The device calendar expo-localization reports, for a spec that mocks
 * `getCalendars` to set the 12/24-hour clock: true for 24-hour, false for
 * 12-hour, null when the device does not say. The library's own mock always
 * says 24-hour.
 */
export const deviceCalendar = (uses24hourClock: boolean | null): [Calendar] => [
  { calendar: null, uses24hourClock, firstWeekday: 1, timeZone: "UTC" },
];
