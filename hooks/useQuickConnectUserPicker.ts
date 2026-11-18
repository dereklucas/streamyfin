import type { UserDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useServerVersion } from "@/hooks/useServerVersion";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { supportsQuickConnectForOtherUsers } from "@/utils/jellyfin/serverVersion";

const EMPTY_USERS: UserDto[] = [];

/**
 * Whose device a Quick Connect code signs in. An administrator on Jellyfin
 * 10.9 or later can approve a code for another account; everyone else
 * approves for themselves. Spec: hooks/useQuickConnectUserPicker.test.tsx.
 */
export const useQuickConnectUserPicker = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const [selectedUserId, setSelectedUserId] = useState<string>();

  const isAdmin = !Platform.isTV && !!user?.Policy?.IsAdministrator;

  // Same key and shape as the other consumers of the server info. Whatever
  // the cache holds will do, since a server does not go back below 10.9, and
  // asking again would be worse than useless: a refetch that fails marks the
  // shared query as errored, which useMediaPreferences reads as not ready.
  const serverVersion = useServerVersion({
    enabled: isAdmin,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // An unknown version counts as an old one: the code is then approved for
  // the signed-in user, as it always was.
  const canAuthorizeOthers =
    isAdmin && supportsQuickConnectForOtherUsers(serverVersion);

  const { data: users = EMPTY_USERS } = useQuery({
    queryKey: ["jellyfin", "users", "enabled"],
    queryFn: async () => {
      if (!api) return EMPTY_USERS;
      const res = await getUserApi(api).getUsers();
      return res.data.filter((u) => !u.Policy?.IsDisabled);
    },
    enabled: !!api && canAuthorizeOthers,
    // Every account on the server: kept out of the cache persisted to disk.
    gcTime: 0,
  });

  // Nothing to pick from on a server whose only enabled account is this one.
  const showUserPicker =
    canAuthorizeOthers && users.some((u) => u.Id !== user?.Id);

  const pickedUser = showUserPicker
    ? users.find((u) => u.Id === selectedUserId)
    : undefined;

  // Somebody was picked and has since left the list. That never falls back
  // to the administrator: a code meant for another user would sign their
  // device in as an admin, and a request without a user id does just that.
  const isPickUnavailable = selectedUserId !== undefined && !pickedUser;

  const targetUser = selectedUserId === undefined ? user : pickedUser;

  // Memoized: PlatformDropdown compares its groups by reference.
  const userGroups = useMemo(
    () => [
      {
        options: users.map((u) => ({
          type: "radio" as const,
          label: u.Name ?? "",
          value: u.Id,
          selected: u.Id === targetUser?.Id,
          // Their own row is no pick at all: it is where the picker starts.
          onPress: () =>
            setSelectedUserId(u.Id === user?.Id ? undefined : u.Id),
        })),
      },
    ],
    [users, user?.Id, targetUser?.Id],
  );

  /** Back to approving for oneself: picking someone is a choice made each time. */
  const reset = useCallback(() => setSelectedUserId(undefined), []);

  return {
    showUserPicker,
    targetUser: targetUser ?? undefined,
    isPickUnavailable,
    userGroups,
    reset,
  };
};
