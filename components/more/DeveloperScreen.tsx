import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Updates from "expo-updates";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { Text } from "@/components/common/Text";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { DIAGNOSTICS_UPDATE_LOG_MAX_AGE_MS } from "@/constants/DevUpdates";
import { buildDiagnosticsReport } from "@/utils/devDiagnostics";
import {
  checkForUpdateNow,
  followBranch,
  followedBranch,
  listForkBranches,
} from "@/utils/devUpdates";
import { readFromLog, writeErrorLog } from "@/utils/log";
import { getVersionInfo } from "@/utils/version";

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  return response.json();
};

/** Everything expo-updates says about this launch, for the report. */
const runningDetails = (
  following: string,
  version: ReturnType<typeof getVersionInfo>,
): Record<string, string> => ({
  appVersion: `${version.version ?? "?"} (${version.build ?? "?"})`,
  commit: version.commit ?? "?",
  branch: version.branch ?? "?",
  following,
  isEnabled: String(Updates.isEnabled),
  channel: Updates.channel ?? "(none)",
  runtimeVersion: Updates.runtimeVersion ?? "(none)",
  updateId: Updates.updateId ?? "(none)",
  createdAt: Updates.createdAt?.toISOString() ?? "(none)",
  isEmbeddedLaunch: String(Updates.isEmbeddedLaunch),
  isEmergencyLaunch: String(Updates.isEmergencyLaunch),
  emergencyLaunchReason: Updates.emergencyLaunchReason ?? "(none)",
  checkAutomatically: String(Updates.checkAutomatically),
  launchDuration: String(Updates.launchDuration),
  platform: `${Platform.OS} ${Platform.Version}`,
});

/**
 * Fork only (More → Developer): what is running, a way to pull the latest
 * update now instead of on the next launch, and a way to follow another
 * branch's updates. See FORK.md.
 */
export const DeveloperScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<string | null>(null);
  const following = followedBranch();
  const version = getVersionInfo();

  const branches = useQuery({
    queryKey: ["forkBranches"],
    queryFn: () => listForkBranches(fetchJson),
    staleTime: 0,
  });

  const run = async (key: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (error) {
      writeErrorLog("Developer update action failed", error);
      toast.error(t("developer.update_failed"));
    } finally {
      setBusy(null);
    }
  };

  const checkNow = () =>
    run("check", async () => {
      if ((await checkForUpdateNow()) === "up-to-date") {
        toast(t("developer.up_to_date"));
      }
    });

  const follow = (branch: string) =>
    run(branch, async () => {
      if ((await followBranch(branch)) === "no-update") {
        toast(t("developer.no_compatible_update", { branch }));
      }
    });

  const shareDiagnostics = () =>
    run("diagnostics", async () => {
      const updateLogs = Updates.isEnabled
        ? await Updates.readLogEntriesAsync(DIAGNOSTICS_UPDATE_LOG_MAX_AGE_MS)
        : [];
      const report = buildDiagnosticsReport({
        generatedAt: new Date(),
        running: runningDetails(following, version),
        updateLogs,
        appLogs: readFromLog(),
      });
      const file = new File(Paths.cache, "streamyfin-diagnostics.txt");
      if (file.exists) file.delete();
      file.create();
      file.write(report);
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/plain",
        UTI: "public.plain-text",
      });
    });

  const bundle = Updates.isEmbeddedLaunch
    ? t("developer.embedded")
    : t("developer.update", { id: Updates.updateId?.slice(0, 8) ?? "?" });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View
        className='p-4 flex flex-col gap-y-4'
        style={{ paddingTop: Platform.OS === "android" ? 10 : 0 }}
      >
        <ListGroup title={t("developer.running")}>
          <ListItem
            title={t("developer.app_version")}
            value={`${version.version ?? "?"} (${version.build ?? "?"})`}
          />
          <ListItem title={t("developer.bundle")} value={bundle} />
          {Updates.createdAt && !Updates.isEmbeddedLaunch ? (
            <ListItem
              title={t("developer.published")}
              value={Updates.createdAt.toLocaleString()}
            />
          ) : null}
          <ListItem
            title={t("developer.commit")}
            value={[version.commit, version.branch].filter(Boolean).join(" · ")}
          />
          <ListItem title={t("developer.following")} value={following} />
          <ListItem
            title={t("developer.runtime")}
            value={Updates.runtimeVersion?.slice(0, 7) ?? "?"}
          />
          <ListItem
            title={t("developer.channel")}
            value={Updates.channel ?? t("developer.no_channel")}
          />
          {/* expo-updates fell back to the built-in bundle: an update failed
              to launch, which otherwise looks like no update at all. */}
          {Updates.isEmergencyLaunch ? (
            <ListItem
              title={t("developer.emergency_launch")}
              subtitle={Updates.emergencyLaunchReason ?? undefined}
              subtitleColor='red'
            />
          ) : null}
        </ListGroup>

        <ListGroup>
          <ListItem
            icon='refresh'
            title={
              busy === "check"
                ? t("developer.checking")
                : Updates.isEnabled
                  ? t("developer.check_now")
                  : t("developer.updates_disabled")
            }
            textColor='blue'
            disabled={!Updates.isEnabled || busy !== null}
            onPress={checkNow}
          />
          <ListItem
            icon='share-outline'
            title={
              busy === "diagnostics"
                ? t("developer.preparing")
                : t("developer.share_diagnostics")
            }
            textColor='blue'
            disabled={busy !== null}
            onPress={shareDiagnostics}
          />
        </ListGroup>

        <ListGroup
          title={t("developer.follow_branch")}
          description={
            <Text className='text-xs text-neutral-500'>
              {t("developer.follow_branch_description")}
            </Text>
          }
        >
          {branches.isError ? (
            <ListItem
              title={t("developer.branches_failed")}
              subtitleColor='red'
            />
          ) : (
            (branches.data ?? [following]).map((branch) => (
              <ListItem
                key={branch}
                title={busy === branch ? t("developer.checking") : branch}
                disabled={!Updates.isEnabled || busy !== null}
                onPress={() => follow(branch)}
                iconAfter={
                  branch === following ? (
                    <Ionicons name='checkmark' size={18} color='white' />
                  ) : undefined
                }
              />
            ))
          )}
        </ListGroup>
      </View>
    </ScrollView>
  );
};
