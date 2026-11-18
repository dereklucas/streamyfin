import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { requireOptionalNativeModule } from "expo-modules-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import type { QuickConnectStatus } from "@/hooks/useQuickConnect";
import { quickConnectPairingUrl } from "@/utils/quickConnectPairing";
import { Button } from "../Button";
import { Text } from "../common/Text";

/** Wide enough to put the QR code beside the code (an iPad) than above it. */
const SIDE_BY_SIDE_WIDTH = 700;

interface Props {
  /** The Quick Connect code to display, or null when hidden. */
  code: string | null;
  status: QuickConnectStatus;
  serverName: string;
  /**
   * The server's address, for the QR code: another phone's camera opens the
   * server's Quick Connect page with the code filled in, and Streamyfin's
   * "Sign in another device" reads the code from it.
   */
  serverUrl?: string;
  onNewCode: () => void;
  onClose: () => void;
}

/**
 * Shows the Quick Connect code while the app polls for authorization.
 * In-app sheet instead of a native Alert so it can dismiss itself once the
 * session is authorized — a native alert has no programmatic dismiss and
 * lingers over the app after login completes.
 */
export const QuickConnectCodeModal: React.FC<Props> = ({
  code,
  status,
  serverName,
  serverUrl,
  onNewCode,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const sideBySide = windowWidth >= SIDE_BY_SIDE_WIDTH;
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  // Taller with the QR code above the code (a phone).
  const snapPoints = useMemo(
    () => [serverUrl && !sideBySide ? "85%" : "60%"],
    [serverUrl, sideBySide],
  );
  const isPresentedRef = useRef(false);
  // Stop resets the provider to idle. Preserve the message while dismissing,
  // or while a replacement code is on its way, rather than flashing a dead code.
  const lastStatusRef = useRef(status);
  if (status !== "idle") lastStatusRef.current = status;
  const displayStatus = status === "idle" ? lastStatusRef.current : status;
  const expired = displayStatus === "expired";
  const disabled = displayStatus === "disabled";
  const signingIn =
    displayStatus === "authenticating" || displayStatus === "signed-in";
  const showCode = !expired && !disabled && !signingIn;

  // Keep the last code around so the dismiss animation doesn't flash empty
  // when the parent clears the code to close the sheet.
  const lastCodeRef = useRef<string | null>(null);
  if (code) lastCodeRef.current = code;

  useEffect(() => {
    if (code) {
      bottomSheetModalRef.current?.present();
    } else if (isPresentedRef.current) {
      bottomSheetModalRef.current?.dismiss();
      isPresentedRef.current = false;
    }
  }, [code]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index >= 0) {
        isPresentedRef.current = true;
      } else if (index === -1 && isPresentedRef.current) {
        isPresentedRef.current = false;
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const copyCode = useCallback(async () => {
    const value = code ?? lastCodeRef.current;
    if (!value) return;
    // Builds that don't ship the expo-clipboard native module yet: probe with
    // requireOptionalNativeModule (returns null instead of throwing/logging)
    // and skip — importing the JS wrapper there would error out.
    if (!requireOptionalNativeModule("ExpoClipboard")) return;
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(value);
    toast.success(t("login.code_copied"));
  }, [code, t]);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      handleIndicatorStyle={{ backgroundColor: "white" }}
      backgroundStyle={{ backgroundColor: "#171717" }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
          paddingBottom: Math.max(16, insets.bottom),
        }}
      >
        <View className='flex-1'>
          <Text className='font-bold text-2xl text-neutral-100'>
            {t("login.quick_connect")}
          </Text>
          {showCode ? (
            <View
              style={
                sideBySide && serverUrl
                  ? { flexDirection: "row", alignItems: "center", gap: 32 }
                  : undefined
              }
            >
              {serverUrl && (code ?? lastCodeRef.current) ? (
                <View className='mt-6 items-center'>
                  {/* White margin: a camera reads a QR code on a quiet zone. */}
                  <View className='bg-white p-3 rounded-xl'>
                    <QRCode
                      value={quickConnectPairingUrl(
                        serverUrl,
                        (code ?? lastCodeRef.current) as string,
                      )}
                      size={sideBySide ? 240 : Math.min(200, windowWidth * 0.5)}
                    />
                  </View>
                </View>
              ) : null}
              <View style={sideBySide && serverUrl ? { flex: 1 } : undefined}>
                <TouchableOpacity
                  className='mt-6 p-6 border border-neutral-800 rounded-xl bg-neutral-900 flex flex-row items-center justify-center'
                  onPress={copyCode}
                >
                  <Text
                    className='text-center font-bold text-5xl text-neutral-100'
                    style={{ letterSpacing: 10 }}
                  >
                    {code ?? lastCodeRef.current}
                  </Text>
                  <Ionicons
                    name='copy-outline'
                    size={22}
                    color='white'
                    style={{ opacity: 0.4, marginLeft: 16 }}
                  />
                </TouchableOpacity>
                <Text className='mt-2 text-neutral-500 text-center text-xs'>
                  {t("login.tap_code_to_copy")}
                </Text>
                <Text className='mt-3 mb-5 text-neutral-400 text-center px-4'>
                  {t("login.quick_connect_instructions")}
                </Text>
              </View>
            </View>
          ) : (
            <Text className='mt-6 mb-5 text-neutral-400 text-center px-4'>
              {disabled
                ? t("companion_login.error_quick_connect_disabled", {
                    server: serverName,
                  })
                : signingIn
                  ? t("common.loading")
                  : t("pairing.code_expired")}
            </Text>
          )}
          {expired && (
            <Button className='mb-3' color='purple' onPress={onNewCode}>
              {t("pairing.get_new_code")}
            </Button>
          )}
          <Button className='mt-auto' color='purple' onPress={onClose}>
            {showCode ? t("login.got_it") : t("common.close")}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
