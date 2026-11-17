import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFICIAL_APPLICATION_IDS } from "./Sentry";

const { expo } = JSON.parse(
  readFileSync(join(__dirname, "..", "app.json"), "utf8"),
);

// Only builds carrying these identifiers, as they are or with the suffix a
// sideloading tool appends, report into the project's Sentry
// (utils/sentry.ts). The list is a constant and not a runtime read of the
// config so that a fork's rename does not move it, which means nothing but
// this test keeps it in step with the identifiers the project really ships.
// A fork that renames the app should leave the constant alone and point
// EXPO_PUBLIC_SENTRY_DSN at its own project.
// Fork (dereklucas/streamyfin): app.json carries the fork's bundle id, so the
// constant must keep upstream's ids and never the fork's, or the fork's
// crashes would land in upstream's Sentry project.
const UPSTREAM_APPLICATION_ID = "com.fredrikburmester.streamyfin";

describe("OFFICIAL_APPLICATION_IDS", () => {
  test("holds upstream's identifier and nothing else", () => {
    expect([...OFFICIAL_APPLICATION_IDS]).toEqual([UPSTREAM_APPLICATION_ID]);
  });

  test("does not hold the fork's iOS bundle identifier", () => {
    expect(OFFICIAL_APPLICATION_IDS).not.toContain(expo.ios.bundleIdentifier);
  });

  test("holds the Android application id of app.json", () => {
    expect(OFFICIAL_APPLICATION_IDS).toContain(expo.android.package);
  });
});
