import { getCalendars } from "expo-localization";
import { formatClockTime } from "@/utils/time";

jest.mock("expo-localization", () => ({ getCalendars: jest.fn() }));

const calendar = (uses24hourClock: boolean | null) =>
  jest.mocked(getCalendars).mockReturnValue([
    {
      calendar: null,
      uses24hourClock,
      firstWeekday: 1,
      timeZone: "UTC",
    },
  ]);

describe("formatClockTime", () => {
  const evening = new Date(2026, 0, 1, 21, 5);

  it("shows a 12-hour time when the device uses a 12-hour clock", () => {
    calendar(false);
    expect(formatClockTime(evening)).toMatch(/^9:05\s?PM$/);
  });

  it("shows a 24-hour time when the device uses a 24-hour clock", () => {
    calendar(true);
    expect(formatClockTime(evening)).toBe("21:05");
  });

  it("falls back to the locale's own clock when the device does not say", () => {
    calendar(null);
    expect(formatClockTime(evening)).toBe(
      evening.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    );
  });
});
