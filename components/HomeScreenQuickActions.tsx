import { getLibraryApi, getUserViewApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform } from "react-native";
import useRouter from "@/hooks/useAppRouter";
import { usePlayItem } from "@/hooks/usePlayItem";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";
import {
  buildHomeScreenActions,
  type HomeScreenActionTarget,
  homeScreenActionTarget,
} from "@/utils/homeScreenActions";

/**
 * The quick actions on the app's Home Screen icon (a long press on it):
 * resuming the latest in-progress item, libraries, Search, and Downloads while
 * anything is downloaded. Keeps them current —
 * refreshed each time the app leaves the foreground, cleared while nobody is
 * signed in — and carries out the one chosen. Renders nothing.
 *
 * Mounted inside the provider stack: resuming plays through usePlayItem.
 * Spec: components/HomeScreenQuickActions.test.tsx.
 */
export const HomeScreenQuickActions = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { t } = useTranslation();
  const router = useRouter();
  const playItem = usePlayItem();
  const signedIn = Boolean(api && user?.Id);

  const { data: resumeItems, refetch } = useQuery({
    queryKey: ["homeScreenActions", "resume", user?.Id],
    queryFn: async () =>
      (
        await getLibraryApi(api!).getResumeItems({
          userId: user!.Id!,
          includeItemTypes: ["Movie", "Episode"],
          limit: 1,
        })
      ).data.Items ?? [],
    enabled: signedIn && !Platform.isTV,
  });

  // The Libraries tab's own query (components/library/Libraries.tsx), so the
  // two share a cache, and its filters: no hidden libraries, no books.
  const { settings } = useSettings();
  const { data: userViews } = useQuery({
    queryKey: ["user-views", user?.Id],
    queryFn: async () =>
      (await getUserViewApi(api!).getUserViews({ userId: user?.Id })).data
        .Items || null,
    staleTime: 60,
    enabled: signedIn && !Platform.isTV,
  });
  const libraries = useMemo(
    () =>
      (userViews ?? [])
        .filter((l) => !settings?.hiddenLibraries?.includes(l.Id!))
        .filter((l) => l.CollectionType !== "books"),
    [userViews, settings?.hiddenLibraries],
  );

  const { downloadedItems } = useDownload();
  const hasDownloads = (downloadedItems?.length ?? 0) > 0;

  useEffect(() => {
    if (Platform.isTV) return;
    const items = signedIn
      ? buildHomeScreenActions(
          { resumeItems: resumeItems ?? [], libraries, hasDownloads },
          t,
        )
      : [];
    QuickActions.setItems(items).catch(() => {
      // Nothing to recover: the icon keeps its previous actions.
    });
  }, [signedIn, resumeItems, libraries, hasDownloads, t]);

  // What was watched last is what the icon offers next, so refresh on the
  // way out.
  useEffect(() => {
    if (!signedIn || Platform.isTV) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") void refetch();
    });
    return () => subscription.remove();
  }, [signedIn, refetch]);

  const carryOut = useCallback(
    (target: HomeScreenActionTarget) => {
      if (target.kind === "resume") {
        void playItem({ Id: target.itemId });
        return;
      }
      router.push(target.href as never);
    },
    [playItem, router],
  );

  // On a cold launch the action arrives before the saved sign-in is
  // restored; it waits for it rather than being lost.
  const [pending, setPending] = useState<HomeScreenActionTarget | null>(null);
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  useQuickActionCallback((action) => {
    const target = homeScreenActionTarget(action);
    if (!target) return;
    if (signedInRef.current) carryOut(target);
    else setPending(target);
  });

  useEffect(() => {
    if (!signedIn || !pending) return;
    setPending(null);
    carryOut(pending);
  }, [signedIn, pending, carryOut]);

  return null;
};
