import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import type { TFunction } from "i18next";
import {
  buildHomeScreenActions,
  homeScreenActionTarget,
} from "./homeScreenActions";

// Interpolated values matter here, so the spec's `t` shows them.
const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}(${JSON.stringify(values)})` : key) as unknown as TFunction;

const TICKS_PER_MINUTE = 600_000_000;
const episode: BaseItemDto = {
  Id: "e5",
  Type: "Episode",
  Name: "My Best Friend's Birthday",
  SeriesName: "Scrubs",
  ParentIndexNumber: 2,
  IndexNumber: 5,
  RunTimeTicks: 30 * TICKS_PER_MINUTE,
  UserData: {
    PlaybackPositionTicks: 7 * TICKS_PER_MINUTE,
  } as BaseItemDto["UserData"],
};
const movie: BaseItemDto = {
  Id: "m1",
  Type: "Movie",
  Name: "1917",
  RunTimeTicks: 119 * TICKS_PER_MINUTE,
  UserData: {
    PlaybackPositionTicks: 60 * TICKS_PER_MINUTE,
  } as BaseItemDto["UserData"],
};

describe("buildHomeScreenActions", () => {
  test("offers resuming what is in progress, then Search and Downloads", () => {
    const actions = buildHomeScreenActions([episode, movie], t);

    expect(actions.map((a) => a.id)).toEqual([
      "resume:e5",
      "resume:m1",
      "search",
      "downloads",
    ]);
  });

  test("names an episode by its show, with where it is and what is left", () => {
    const [resume] = buildHomeScreenActions([episode], t);

    expect(resume).toMatchObject({
      title: "Scrubs",
      icon: "symbol:play.fill",
      params: { itemId: "e5" },
    });
    expect(resume.subtitle).toContain('"season":2,"episode":5');
    expect(resume.subtitle).toContain('"count":23');
  });

  test("names a movie by its title", () => {
    const [resume] = buildHomeScreenActions([movie], t);

    expect(resume.title).toBe("1917");
    expect(resume.subtitle).toContain('"count":59');
  });

  test("keeps to the four actions iOS shows", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      ...movie,
      Id: `m${i}`,
    }));

    const actions = buildHomeScreenActions(many, t);

    expect(actions).toHaveLength(4);
    expect(actions.slice(-2).map((a) => a.id)).toEqual(["search", "downloads"]);
  });

  test("offers only Search and Downloads with nothing in progress", () => {
    expect(buildHomeScreenActions([], t).map((a) => a.id)).toEqual([
      "search",
      "downloads",
    ]);
  });
});

describe("homeScreenActionTarget", () => {
  test("resumes the item a resume action names", () => {
    expect(
      homeScreenActionTarget({
        id: "resume:e5",
        title: "",
        params: { itemId: "e5" },
      }),
    ).toEqual({ kind: "resume", itemId: "e5" });
  });

  test("opens the page a navigation action names", () => {
    expect(homeScreenActionTarget({ id: "search", title: "" })).toEqual({
      kind: "navigate",
      href: "/(auth)/(tabs)/(search)",
    });
    expect(homeScreenActionTarget({ id: "downloads", title: "" })).toEqual({
      kind: "navigate",
      href: "/downloads",
    });
  });

  test("ignores an action it does not know", () => {
    expect(homeScreenActionTarget({ id: "old", title: "" })).toBeNull();
  });
});
