/**
 * The fork's developer screen (More → Developer): which updates it can
 * follow. Fork only, see FORK.md.
 */

/** The GitHub repository whose branches the screen lists. */
export const FORK_GITHUB_REPO = "dereklucas/streamyfin";

/**
 * The branch the build's own update channel follows. Following it clears the
 * channel override instead of naming a channel.
 */
export const DEPLOY_BRANCH = "development";

/**
 * Branches that get their own update channel on every push
 * (.eas/workflows/preview-branches.yml), so only these are worth listing.
 */
export const PREVIEW_BRANCH_PREFIXES: readonly string[] = ["fix/", "feat/"];

/** Where the followed branch is remembered, in MMKV. */
export const FOLLOWED_BRANCH_STORAGE_KEY = "devUpdates.followedBranch";

/** How far back the shared diagnostics read expo-updates' own log. */
export const DIAGNOSTICS_UPDATE_LOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** How many of the newest app log entries the shared diagnostics include. */
export const DIAGNOSTICS_MAX_APP_LOGS = 300;
