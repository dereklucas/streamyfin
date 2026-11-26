import { getCalendars } from "expo-localization";

/**
 * The hour of a time format by the device's 12/24-hour clock, to spread last
 * into the format's options. The setting is a device preference, not part of
 * the locale, so a locale alone gets it wrong (an en-US phone set to 24-hour
 * still says PM), and so does a language passed in. 24-hour has two-digit
 * hours ("05:30"), as iOS writes them; 12-hour has one ("5:30 PM"). When the
 * device does not say, the locale's own clock.
 *
 * Its own module, not utils/time: that one is imported nearly everywhere,
 * and expo-localization is a native module.
 */
export const deviceClock = (): Pick<
  Intl.DateTimeFormatOptions,
  "hour" | "hour12"
> => {
  const uses24hourClock = getCalendars()?.[0]?.uses24hourClock;
  if (uses24hourClock == null) return { hour: "numeric" };
  return uses24hourClock
    ? { hour: "2-digit", hour12: false }
    : { hour: "numeric", hour12: true };
};

/** A wall-clock time, as "9:05 PM" or "21:05" by the device's own clock. */
export const formatClockTime = (date: Date): string =>
  date.toLocaleTimeString([], { minute: "2-digit", ...deviceClock() });
