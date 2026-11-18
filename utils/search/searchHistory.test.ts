import {
  EMPTY_SEARCH_HISTORY,
  parseSearchHistory,
  rememberItem,
  rememberQuery,
  searchHistoryKey,
} from "./searchHistory";

describe("rememberItem", () => {
  test("puts the item first, once", () => {
    const history = { itemIds: ["a", "b", "c"], queries: [] };

    expect(rememberItem(history, "b").itemIds).toEqual(["b", "a", "c"]);
  });

  test("keeps only the most recent ones", () => {
    const itemIds = Array.from({ length: 12 }, (_, i) => `item-${i}`);

    const next = rememberItem({ itemIds, queries: [] }, "new");

    expect(next.itemIds).toHaveLength(12);
    expect(next.itemIds[0]).toBe("new");
    expect(next.itemIds).not.toContain("item-11");
  });
});

describe("rememberQuery", () => {
  test("puts the search first, once, whatever its case and spacing", () => {
    const history = { itemIds: [], queries: ["alien", "Heat"] };

    expect(rememberQuery(history, "  heat ").queries).toEqual([
      "heat",
      "alien",
    ]);
  });

  test("ignores an empty search", () => {
    expect(rememberQuery(EMPTY_SEARCH_HISTORY, "   ")).toBe(
      EMPTY_SEARCH_HISTORY,
    );
  });

  test("keeps only the most recent ones", () => {
    const queries = Array.from({ length: 8 }, (_, i) => `q${i}`);

    const next = rememberQuery({ itemIds: [], queries }, "new");

    expect(next.queries).toEqual(["new", ...queries.slice(0, 7)]);
  });
});

describe("parseSearchHistory", () => {
  test("reads what was saved", () => {
    const saved = { itemIds: ["a"], queries: ["heat"] };

    expect(parseSearchHistory(JSON.stringify(saved))).toEqual(saved);
  });

  // Storage is written by older and newer builds alike.
  test("starts empty from nothing, garbage or the wrong shape", () => {
    expect(parseSearchHistory(undefined)).toEqual(EMPTY_SEARCH_HISTORY);
    expect(parseSearchHistory("{not json")).toEqual(EMPTY_SEARCH_HISTORY);
    expect(
      parseSearchHistory(JSON.stringify({ itemIds: "a", queries: [1, "x"] })),
    ).toEqual({ itemIds: [], queries: ["x"] });
  });
});

describe("searchHistoryKey", () => {
  test("keeps each user's history apart, on each server", () => {
    expect(searchHistoryKey("server-1", "user-1")).not.toBe(
      searchHistoryKey("server-2", "user-1"),
    );
    expect(searchHistoryKey("server-1", "user-1")).not.toBe(
      searchHistoryKey("server-1", "user-2"),
    );
  });

  test("has none without a user", () => {
    expect(searchHistoryKey("server-1", undefined)).toBeNull();
  });
});
