import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform } from "react-native";
import useRouter from "@/hooks/useAppRouter";
import { usePlayItem } from "@/hooks/usePlayItem";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import {
  buildHomeScreenActions,
  HOME_SCREEN_MAX_ACTIONS,
  type HomeScreenActionTarget,
  homeScreenActionTarget,
} from "@/utils/homeScreenActions";

/**
 * The quick actions on the app's Home Screen icon (a long press on it):
 * resuming what is in progress, Search and Downloads. Keeps them current —
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
          limit: HOME_SCREEN_MAX_ACTIONS,
        })
      ).data.Items ?? [],
    enabled: signedIn && !Platform.isTV,
  });

  useEffect(() => {
    if (Platform.isTV) return;
    const items = signedIn ? buildHomeScreenActions(resumeItems ?? [], t) : [];
    QuickActions.setItems(items).catch(() => {
      // Nothing to recover: the icon keeps its previous actions.
    });
  }, [signedIn, resumeItems, t]);

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
