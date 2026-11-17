import * as Updates from "expo-updates";
import {
  DEPLOY_BRANCH,
  FOLLOWED_BRANCH_STORAGE_KEY,
  FORK_GITHUB_REPO,
  PREVIEW_BRANCH_PREFIXES,
} from "@/constants/DevUpdates";
import { storage } from "@/utils/mmkv";

export type UpdateOutcome = "reloading" | "up-to-date";
export type FollowOutcome = "reloading" | "no-update";

/** The branch whose updates the app follows; the deploy branch unless set. */
export const followedBranch = (): string =>
  storage.getString(FOLLOWED_BRANCH_STORAGE_KEY) ?? DEPLOY_BRANCH;

// The deploy branch is the build's own channel: no override at all, so the
// build keeps exactly the request headers it was built with.
const applyChannel = (branch: string) =>
  Updates.setUpdateRequestHeadersOverride(
    branch === DEPLOY_BRANCH ? null : { "expo-channel-name": branch },
  );

const fetchAndReload = async () => {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
};

/** Checks the followed channel now and, when it has a new update, loads it. */
export const checkForUpdateNow = async (): Promise<UpdateOutcome> => {
  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) return "up-to-date";
  await fetchAndReload();
  return "reloading";
};

/**
 * Follows a branch's updates and loads its latest. A branch with nothing this
 * build can run (native changes, or never published) leaves the app on the
 * branch it followed before.
 */
export const followBranch = async (branch: string): Promise<FollowOutcome> => {
  const previous = followedBranch();
  applyChannel(branch);
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) {
      applyChannel(previous);
      return "no-update";
    }
    storage.set(FOLLOWED_BRANCH_STORAGE_KEY, branch);
    await fetchAndReload();
    return "reloading";
  } catch (error) {
    applyChannel(previous);
    throw error;
  }
};

/**
 * The fork's branches that have update channels, the deploy branch first.
 * `fetchJson` is injected so the screen decides how to fetch (and so the
 * spec needs no network).
 */
export const listForkBranches = async (
  fetchJson: (url: string) => Promise<unknown>,
): Promise<string[]> => {
  const body = await fetchJson(
    `https://api.github.com/repos/${FORK_GITHUB_REPO}/branches?per_page=100`,
  );
  const names = (Array.isArray(body) ? body : [])
    .map((branch) => (branch as { name?: unknown }).name)
    .filter((name): name is string => typeof name === "string");
  const previews = names
    .filter((name) =>
      PREVIEW_BRANCH_PREFIXES.some((prefix) => name.startsWith(prefix)),
    )
    .sort();
  return [DEPLOY_BRANCH, ...previews];
};
