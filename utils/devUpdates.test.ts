import * as Updates from "expo-updates";
import { DEPLOY_BRANCH } from "@/constants/DevUpdates";
import { storage } from "@/utils/mmkv";
import {
  checkForUpdateNow,
  followBranch,
  followedBranch,
  listForkBranches,
} from "./devUpdates";

jest.mock("expo-updates", () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  setUpdateRequestHeadersOverride: jest.fn(),
}));

const updates = jest.mocked(Updates);

describe("devUpdates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.clearAll();
    updates.fetchUpdateAsync.mockResolvedValue({
      isNew: true,
    } as Updates.UpdateFetchResult);
    updates.reloadAsync.mockResolvedValue();
  });

  describe("checkForUpdateNow", () => {
    test("downloads and reloads into a new update", async () => {
      updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: true,
      } as Updates.UpdateCheckResult);

      await expect(checkForUpdateNow()).resolves.toBe("reloading");
      expect(updates.fetchUpdateAsync).toHaveBeenCalled();
      expect(updates.reloadAsync).toHaveBeenCalled();
    });

    test("says it is up to date when there is nothing new", async () => {
      updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: false,
      } as Updates.UpdateCheckResult);

      await expect(checkForUpdateNow()).resolves.toBe("up-to-date");
      expect(updates.reloadAsync).not.toHaveBeenCalled();
    });
  });

  describe("followBranch", () => {
    test("points the update channel at the branch and loads its update", async () => {
      updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: true,
      } as Updates.UpdateCheckResult);

      await expect(followBranch("fix/thing")).resolves.toBe("reloading");
      expect(updates.setUpdateRequestHeadersOverride).toHaveBeenCalledWith({
        "expo-channel-name": "fix/thing",
      });
      expect(followedBranch()).toBe("fix/thing");
    });

    test("following the deploy branch goes back to the build's own channel", async () => {
      storage.set("devUpdates.followedBranch", "fix/thing");
      updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: true,
      } as Updates.UpdateCheckResult);

      await followBranch(DEPLOY_BRANCH);

      expect(updates.setUpdateRequestHeadersOverride).toHaveBeenCalledWith(
        null,
      );
      expect(followedBranch()).toBe(DEPLOY_BRANCH);
    });

    // A branch whose native code changed has no update this build can run,
    // and a branch never pushed since the workflow existed has no channel.
    // Either way the app must stay on what it was following.
    test("stays on the previous branch when the new one has nothing to load", async () => {
      storage.set("devUpdates.followedBranch", "fix/old");
      updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: false,
      } as Updates.UpdateCheckResult);

      await expect(followBranch("feat/native")).resolves.toBe("no-update");

      expect(updates.setUpdateRequestHeadersOverride).toHaveBeenLastCalledWith({
        "expo-channel-name": "fix/old",
      });
      expect(followedBranch()).toBe("fix/old");
      expect(updates.reloadAsync).not.toHaveBeenCalled();
    });

    test("stays on the previous branch when the check fails", async () => {
      updates.checkForUpdateAsync.mockRejectedValue(new Error("no channel"));

      await expect(followBranch("fix/thing")).rejects.toThrow("no channel");

      expect(updates.setUpdateRequestHeadersOverride).toHaveBeenLastCalledWith(
        null,
      );
      expect(followedBranch()).toBe(DEPLOY_BRANCH);
    });
  });

  describe("listForkBranches", () => {
    test("lists the fork's branches with the deploy branch first", async () => {
      const fetchJson = jest
        .fn()
        .mockResolvedValue([
          { name: "fix/b" },
          { name: DEPLOY_BRANCH },
          { name: "develop" },
          { name: "feat/a" },
        ]);

      await expect(listForkBranches(fetchJson)).resolves.toEqual([
        DEPLOY_BRANCH,
        "feat/a",
        "fix/b",
      ]);
      expect(fetchJson).toHaveBeenCalledWith(
        expect.stringContaining("/repos/dereklucas/streamyfin/branches"),
      );
    });
  });
});
