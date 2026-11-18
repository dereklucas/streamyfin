import { readBuildNotes } from "./devBuildNotes";

describe("readBuildNotes", () => {
  test("reads the notes the config baked in", () => {
    expect(readBuildNotes({ build: { notes: ["fix(a): one"] } })).toEqual([
      "fix(a): one",
    ]);
  });

  // A build made before notes existed, or a config in another shape.
  test("has none for a build without notes, or anything else", () => {
    expect(readBuildNotes({ build: {} })).toEqual([]);
    expect(readBuildNotes(undefined)).toEqual([]);
    expect(readBuildNotes({ build: { notes: "x" } })).toEqual([]);
    expect(readBuildNotes({ build: { notes: ["ok", 3] } })).toEqual(["ok"]);
  });
});
