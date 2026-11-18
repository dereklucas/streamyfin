import { makeApi } from "@/test-utils/jellyfinApi";
import { getGenrePosters, getTopGenres } from "./genres";

const sentQuery = (api: ReturnType<typeof makeApi>, index = 0) => {
  const url = new URL(api.mock.history.get[index].url ?? "");
  return { path: url.pathname, query: url.searchParams };
};

describe("getTopGenres", () => {
  test("lists the genres with the most movies and shows first", async () => {
    const api = makeApi({
      Items: [
        { Id: "drama", Name: "Drama", MovieCount: 40, SeriesCount: 30 },
        { Id: "western", Name: "Western", MovieCount: 2, SeriesCount: 0 },
        { Id: "comedy", Name: "Comedy", MovieCount: 50, SeriesCount: 40 },
      ],
    });

    const genres = await getTopGenres({ api, userId: "user-1", limit: 2 });

    expect(genres.map((g) => g.Id)).toEqual(["comedy", "drama"]);
    const { path, query } = sentQuery(api);
    expect(path).toBe("/Genres");
    expect(query.get("userId")).toBe("user-1");
    expect(query.getAll("includeItemTypes")).toEqual(["Movie", "Series"]);
    expect(query.getAll("fields")).toContain("ItemCounts");
  });

  // A server that leaves the counts out keeps its own (name) order.
  test("keeps the server's order without counts, and drops empty genres", async () => {
    const api = makeApi({
      Items: [
        { Id: "action", Name: "Action" },
        { Id: "empty", Name: "Empty", MovieCount: 0, SeriesCount: 0 },
        { Id: "drama", Name: "Drama" },
      ],
    });

    const genres = await getTopGenres({ api, userId: "user-1", limit: 12 });

    expect(genres.map((g) => g.Id)).toEqual(["action", "drama"]);
  });
});

describe("getGenrePosters", () => {
  test("asks for the genre's best rated movies and shows with a poster", async () => {
    const api = makeApi({ Items: [{ Id: "m1" }, { Id: "s1" }] });

    const items = await getGenrePosters({
      api,
      userId: "user-1",
      genreId: "drama",
      limit: 3,
    });

    expect(items.map((i) => i.Id)).toEqual(["m1", "s1"]);
    const { path, query } = sentQuery(api);
    expect(path).toBe("/Items");
    expect(query.get("genreIds")).toBe("drama");
    expect(query.getAll("includeItemTypes")).toEqual(["Movie", "Series"]);
    expect(query.getAll("sortBy")).toEqual(["CommunityRating", "SortName"]);
    expect(query.getAll("sortOrder")).toEqual(["Descending", "Ascending"]);
    expect(query.getAll("imageTypes")).toEqual(["Primary"]);
    expect(query.get("limit")).toBe("3");
    expect(query.get("recursive")).toBe("true");
  });
});
