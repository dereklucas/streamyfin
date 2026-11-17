import { DIAGNOSTICS_MAX_APP_LOGS } from "@/constants/DevUpdates";
import type { LogEntry } from "@/utils/logStorage";

/** The fields of an expo-updates log entry the report prints. */
export interface UpdateLogLine {
  timestamp: number;
  level: string;
  code: string;
  message: string;
  updateId?: string;
}

interface ReportInput {
  generatedAt: Date;
  /** What is running, as label → value. */
  running: Record<string, string>;
  updateLogs: UpdateLogLine[];
  appLogs: LogEntry[];
  maxAppLogs?: number;
}

const renderData = (data: unknown) => {
  if (data === undefined) return "";
  try {
    return ` ${typeof data === "string" ? data : JSON.stringify(data)}`;
  } catch {
    return " [unrenderable]";
  }
};

/**
 * The Developer screen's shareable report: what is running, expo-updates'
 * own log and the newest app log entries, as plain text to paste into an
 * issue or a chat. The app log is redacted when it is stored (logStorage).
 */
export const buildDiagnosticsReport = ({
  generatedAt,
  running,
  updateLogs,
  appLogs,
  maxAppLogs = DIAGNOSTICS_MAX_APP_LOGS,
}: ReportInput): string => {
  const lines: string[] = [
    "# Streamyfin diagnostics",
    `Generated ${generatedAt.toISOString()}`,
    "",
    "## Running",
    ...Object.entries(running).map(([key, value]) => `${key}: ${value}`),
    "",
    "## expo-updates log",
  ];

  const updateLines = [...updateLogs]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(
      (entry) =>
        `${new Date(entry.timestamp).toISOString()} ${entry.level} ${entry.code}` +
        `${entry.updateId ? ` [${entry.updateId}]` : ""} ${entry.message}`,
    );
  lines.push(
    ...(updateLines.length ? updateLines : ["(no expo-updates log entries)"]),
  );

  lines.push("", "## App log");
  const newest = [...appLogs]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-maxAppLogs)
    .map(
      (entry) =>
        `${entry.timestamp} ${entry.level} ${entry.message}${renderData(entry.data)}`,
    );
  lines.push(...(newest.length ? newest : ["(no app log entries)"]));

  return `${lines.join("\n")}\n`;
};
