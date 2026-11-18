import { fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import { Platform } from "react-native";
import Settings from "@/app/(auth)/(tabs)/(more)/settings";
import { userAtom } from "@/providers/JellyfinProvider";

const mockPush = jest.fn();
jest.mock("@/hooks/useAppRouter", () => ({
  __esModule: true,
  default: () => ({ push: mockPush }),
}));
let mockAdmin = false;
const renderSettings = async () => {
  const store = createStore();
  store.set(userAtom, {
    Id: "user-1",
    Name: "Ada",
    Policy: { IsAdministrator: mockAdmin },
  } as never);
  await render(
    <JotaiProvider store={store}>
      <Settings />
    </JotaiProvider>,
  );
};
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    userAtom: atom(null),
    useJellyfin: () => ({ logout: jest.fn() }),
  };
});
// The other sections of the screen have nothing to do with the entry.
jest.mock("@/components/common/HeaderButton", () => ({
  HeaderButton: () => null,
}));
jest.mock("@/components/settings/AppLanguageSelector", () => ({
  AppLanguageSelector: () => null,
}));
jest.mock("@/components/settings/StorageSettings", () => ({
  StorageSettings: () => null,
}));
jest.mock("@/components/settings/UserInfo", () => ({ UserInfo: () => null }));
// The Notifications row asks the server's plugin first: here no plugin
// answers, as on a server whose plugin does not serve the routes.
jest.mock("@/hooks/useMyNotifications", () => ({
  useMyNotifications: () => ({ supported: false, mine: undefined }),
}));
jest.mock("@/providers/SyncPlayProvider", () => ({
  useSyncPlay: () => ({ available: false }),
}));

describe("Settings, sign in another device", () => {
  beforeEach(() => {
    mockAdmin = false;
    mockPush.mockClear();
  });

  // The entry was hidden on iOS while pairing went through a UDP broadcast.
  // Quick Connect needs no local network access, so an iPhone gets it too.
  // One entry for a TV, an iPad or a browser alike: scan or type (#11).
  test("offers one entry to sign in another device, from an iPhone", async () => {
    expect(Platform.OS).toBe("ios");
    await renderSettings();

    await fireEvent.press(screen.getByText("pairing.sign_in_another_device"));
    expect(mockPush).toHaveBeenCalledWith(
      "/(auth)/(tabs)/(more)/companion-login",
    );
  });

  // Administrators too: the pairing screen has the account picker (#11).
  test("gives administrators the same single entry", async () => {
    mockAdmin = true;
    await renderSettings();

    expect(screen.getByText("pairing.sign_in_another_device")).toBeTruthy();
  });
});
