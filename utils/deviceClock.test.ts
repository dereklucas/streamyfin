import { getCalendars } from "expo-localization";
import { deviceCalendar } from "@/test-utils/deviceClock";
import { deviceClock, formatClockTime } from "@/utils/deviceClock";

jest.mock("expo-localization", () => ({ getCalendars: jest.fn() }));

const setDeviceClock = (uses24hourClock: boolean | null) =>
  jest.mocked(getCalendars).mockReturnValue(deviceCalendar(uses24hourClock));

describe("formatClockTime", () => {
  const evening = new Date(2026, 0, 1, 21, 5);

  it("shows a 12-hour time when the device uses a 12-hour clock", () => {
    setDeviceClock(false);
    expect(formatClockTime(evening)).toMatch(/^9:05\sPM$/);
  });

  it("shows a 24-hour time when the device uses a 24-hour clock", () => {
    setDeviceClock(true);
    expect(formatClockTime(evening)).toBe("21:05");
  });

  it("writes 24-hour hours with two digits", () => {
    setDeviceClock(true);
    expect(formatClockTime(new Date(2026, 0, 1, 5, 30))).toBe("05:30");
  });

  it("falls back to the locale's own clock when the device does not say", () => {
    setDeviceClock(null);
    expect(formatClockTime(evening)).toBe(
      evening.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    );
  });
});

// The options any time display spreads into its own, so a language passed in
// still shows the time by the device's clock.
describe("deviceClock", () => {
  it("asks for the device's clock", () => {
    setDeviceClock(false);
    expect(deviceClock()).toEqual({ hour: "numeric", hour12: true });
    setDeviceClock(true);
    expect(deviceClock()).toEqual({ hour: "2-digit", hour12: false });
  });

  it("leaves the clock to the locale when the device does not say", () => {
    setDeviceClock(null);
    expect(deviceClock()).toEqual({ hour: "numeric" });
  });
});
