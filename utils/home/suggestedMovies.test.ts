import type { Settings } from "@/utils/atoms/settings";
import { showsSuggestedMovies } from "./suggestedMovies";

const settings = (extra: Partial<Settings>) => extra as Settings;

describe("showsSuggestedMovies", () => {
  test("shows Jellyfin's suggestions by default", () => {
    expect(showsSuggestedMovies(settings({}))).toBe(true);
  });

  // Upstream #1755: the row could not be turned off.
  test("leaves them out when turned off", () => {
    expect(showsSuggestedMovies(settings({ showSuggestedMovies: false }))).toBe(
      false,
    );
  });

  test("leaves them out while StreamyStats recommends movies instead", () => {
    expect(
      showsSuggestedMovies(
        settings({ streamyStatsMovieRecommendations: true }),
      ),
    ).toBe(false);
  });
});
