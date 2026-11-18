import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { pickGenrePosters } from "./genrePosters";

const items = (...ids: string[]): BaseItemDto[] => ids.map((Id) => ({ Id }));
const idsOf = (posters: Map<string, BaseItemDto[]>, genreId: string) =>
  posters.get(genreId)?.map((item) => item.Id);

describe("pickGenrePosters", () => {
  // The best rated titles belong to several genres at once: Drama, Crime and
  // Thriller all led with the same three posters.
  test("shows a title on one tile only", () => {
    const posters = pickGenrePosters(
      [
        {
          genreId: "drama",
          items: items("godfather", "shawshank", "heat", "a"),
        },
        {
          genreId: "crime",
          items: items("godfather", "heat", "shawshank", "b", "c"),
        },
      ],
      3,
    );

    const all = [...posters.values()].flat().map((item) => item.Id);
    expect(new Set(all).size).toBe(all.length);
    expect(idsOf(posters, "drama")).toHaveLength(3);
    expect(idsOf(posters, "crime")).toHaveLength(3);
  });

  // Taking turns keeps the first genre from taking every top title.
  test("takes turns, so each tile leads with one of its best", () => {
    const posters = pickGenrePosters(
      [
        { genreId: "drama", items: items("godfather", "shawshank", "x") },
        { genreId: "crime", items: items("godfather", "shawshank", "y") },
      ],
      2,
    );

    expect(idsOf(posters, "drama")).toEqual(["godfather", "x"]);
    expect(idsOf(posters, "crime")).toEqual(["shawshank", "y"]);
  });

  test("shows fewer posters rather than a repeat", () => {
    const posters = pickGenrePosters(
      [
        { genreId: "drama", items: items("a", "b") },
        { genreId: "crime", items: items("a", "b", "c") },
      ],
      3,
    );

    expect(idsOf(posters, "drama")).toEqual(["a"]);
    expect(idsOf(posters, "crime")).toEqual(["b", "c"]);
  });

  // An empty tile looks broken; a repeat there is the lesser evil.
  test("repeats a title only for a tile that would have none", () => {
    const posters = pickGenrePosters(
      [
        { genreId: "drama", items: items("a") },
        { genreId: "crime", items: items("a") },
      ],
      3,
    );

    expect(idsOf(posters, "crime")).toEqual(["a"]);
  });
});
