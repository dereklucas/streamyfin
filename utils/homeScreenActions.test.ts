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

const library = (
  Id: string,
  Name: string,
  CollectionType?: BaseItemDto["CollectionType"],
): BaseItemDto => ({ Id, Name, CollectionType, Type: "CollectionFolder" });
const LIBRARIES = [
  library("music", "Music", "music"),
  library("tv", "TV Shows", "tvshows"),
  library("kids", "Kids", "movies"),
  library("movies", "Movies", "movies"),
  library("home", "Home Videos", "homevideos"),
];
const build = (
  resumeItems: BaseItemDto[],
  { libraries = LIBRARIES, hasDownloads = true } = {},
) => buildHomeScreenActions({ resumeItems, libraries, hasDownloads }, t);
const ids = (actions: { id: string }[]) => actions.map((a) => a.id);

describe("buildHomeScreenActions", () => {
  test("offers one resume, a library, Search and Downloads", () => {
    expect(ids(build([episode, movie]))).toEqual([
      "resume:e5",
      "library:tv",
      "search",
      "downloads",
    ]);
  });

  test("fills the slots with libraries, the TV and movie ones first", () => {
    expect(ids(build([], { hasDownloads: false }))).toEqual([
      "library:tv",
      "library:kids",
      "library:movies",
      "search",
    ]);
  });

  test("leaves Downloads out while nothing is downloaded", () => {
    expect(ids(build([episode], { hasDownloads: false }))).toEqual([
      "resume:e5",
      "library:tv",
      "library:kids",
      "search",
    ]);
  });

  test("takes the other libraries in the server's order", () => {
    const actions = build([], {
      libraries: [
        library("music", "Music", "music"),
        library("home", "Home Videos", "homevideos"),
      ],
    });

    expect(ids(actions)).toEqual([
      "library:music",
      "library:home",
      "search",
      "downloads",
    ]);
  });

  test("names a library and gives it a fitting icon", () => {
    const [tv, kids] = build([], { hasDownloads: false });

    expect(tv).toMatchObject({ title: "TV Shows", icon: "symbol:tv" });
    expect(kids).toMatchObject({ title: "Kids", icon: "symbol:film" });
  });

  test("names an episode by its show, with where it is and what is left", () => {
    const [resume] = build([episode]);

    expect(resume).toMatchObject({
      title: "Scrubs",
      icon: "symbol:play.fill",
      params: { itemId: "e5" },
    });
    expect(resume.subtitle).toContain('"season":2,"episode":5');
    expect(resume.subtitle).toContain('"count":23');
  });

  test("names a movie by its title", () => {
    const [resume] = build([movie]);

    expect(resume.title).toBe("1917");
    expect(resume.subtitle).toContain('"count":59');
  });

  test("never offers more than the four iOS shows", () => {
    expect(build([episode]).length).toBeLessThanOrEqual(4);
    expect(build([]).length).toBe(4);
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

  test("opens the library a library action names", () => {
    expect(homeScreenActionTarget({ id: "library:tv", title: "" })).toEqual({
      kind: "navigate",
      href: "/(auth)/(tabs)/(libraries)/tv",
    });
  });

  test("ignores an action it does not know", () => {
    expect(homeScreenActionTarget({ id: "old", title: "" })).toBeNull();
  });
});
