import type { Settings } from "@/utils/atoms/settings";

/**
 * Whether Home shows Jellyfin's Suggested movies row: unless turned off in
 * Appearance (upstream #1755), and not while StreamyStats recommends movies
 * in its place. A setting saved before the switch existed counts as on.
 */
export const showsSuggestedMovies = (
  settings: Pick<
    Settings,
    "showSuggestedMovies" | "streamyStatsMovieRecommendations"
  >,
): boolean =>
  settings.showSuggestedMovies !== false &&
  !settings.streamyStatsMovieRecommendations;
