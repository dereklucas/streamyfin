import { buildDiagnosticsReport } from "./devDiagnostics";

describe("buildDiagnosticsReport", () => {
  const base = {
    generatedAt: new Date("2026-11-17T06:00:00.000Z"),
    running: { channel: "production", isEmbeddedLaunch: "true" },
    updateLogs: [],
    appLogs: [],
  };

  test("lists what is running, one key per line", () => {
    const report = buildDiagnosticsReport(base);

    expect(report).toContain("Generated 2026-11-17T06:00:00.000Z");
    expect(report).toContain("channel: production");
    expect(report).toContain("isEmbeddedLaunch: true");
  });

  test("includes the expo-updates log oldest first, with codes and update ids", () => {
    const report = buildDiagnosticsReport({
      ...base,
      updateLogs: [
        {
          timestamp: Date.parse("2026-11-17T05:59:00.000Z"),
          level: "error",
          code: "UpdateFailedToLoad",
          message: "second",
          updateId: "abc",
        },
        {
          timestamp: Date.parse("2026-11-17T05:58:00.000Z"),
          level: "info",
          code: "None",
          message: "first",
        },
      ],
    });

    expect(report.indexOf("first")).toBeLessThan(report.indexOf("second"));
    expect(report).toContain(
      "2026-11-17T05:59:00.000Z error UpdateFailedToLoad [abc] second",
    );
  });

  test("keeps only the newest app log entries, oldest first", () => {
    const appLogs = Array.from({ length: 5 }, (_, i) => ({
      timestamp: `2026-11-17T05:0${i}:00.000Z`,
      level: "INFO" as const,
      message: `entry ${i}`,
    }));

    const report = buildDiagnosticsReport({ ...base, appLogs, maxAppLogs: 2 });

    expect(report).not.toContain("entry 2");
    expect(report.indexOf("entry 3")).toBeLessThan(report.indexOf("entry 4"));
  });

  test("renders an app log entry's data", () => {
    const report = buildDiagnosticsReport({
      ...base,
      appLogs: [
        {
          timestamp: "2026-11-17T05:00:00.000Z",
          level: "ERROR",
          message: "failed",
          data: { status: 500 },
        },
      ],
    });

    expect(report).toContain('ERROR failed {"status":500}');
  });

  test("says so when a log is empty", () => {
    const report = buildDiagnosticsReport(base);

    expect(report).toContain("(no expo-updates log entries)");
    expect(report).toContain("(no app log entries)");
  });
});
