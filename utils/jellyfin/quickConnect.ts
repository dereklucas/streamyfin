import type { Api } from "@jellyfin/sdk";
import { getAuthenticationApi } from "@jellyfin/sdk/lib/utils/api";
import axios from "axios";

/** Whether the Jellyfin server has Quick Connect turned on. */
export const isQuickConnectEnabled = async (api: Api): Promise<boolean> =>
  (await getAuthenticationApi(api).getQuickConnectEnabled()).data === true;

/**
 * Approves a Quick Connect code as the user this client is signed in as.
 *
 * No userId: QuickConnectController authorizes the caller, and naming someone
 * else is the part that needs elevation, so this works for an ordinary account
 * and cannot be turned against another user.
 *
 * Three answers rather than two: a code the server has never heard of and a
 * code it refuses to approve are different problems. Anything else throws.
 */
/**
 * Approves a Quick Connect code with this session. `userId` signs the
 * device in as another account (an administrator's choice, Jellyfin 10.9+);
 * without it the device is signed in as the caller.
 */
export const approveQuickConnectCode = async (
  api: Api,
  code: string,
  userId?: string,
): Promise<"approved" | "unknown-code" | "refused"> => {
  try {
    const { data } = await getAuthenticationApi(api).authorizeQuickConnect(
      userId ? { code, userId } : { code },
    );
    return data ? "approved" : "refused";
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return "unknown-code";
    throw e;
  }
};
