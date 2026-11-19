/**
 * Fork only: what changed in the running build or update, for the Developer
 * screen's "What to test". The ship workflow (.github/workflows/fork-ios.yml)
 * lists the commits since the build it was made on in BUILD_NOTES, and
 * app.config.ts bakes them into `extra.build.notes`, so an update carries
 * its own list. See FORK.md.
 */

/** The notes in an `extra` from expo-constants; none if it has none. */
export const readBuildNotes = (extra: unknown): string[] => {
  const notes = (extra as { build?: { notes?: unknown } } | undefined)?.build
    ?.notes;
  return Array.isArray(notes)
    ? notes.filter((note): note is string => typeof note === "string")
    : [];
};
