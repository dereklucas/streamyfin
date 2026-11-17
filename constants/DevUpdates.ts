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
