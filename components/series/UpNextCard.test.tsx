import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { makeApi } from "@/test-utils/jellyfinApi";
import { QueryWrapper } from "@/test-utils/queryWrapper";
import { UpNextCard } from "./UpNextCard";

jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { apiAtom: atom(null), userAtom: atom(null) };
});
const mockPlay = jest.fn(async (_item: BaseItemDto) => {});
jest.mock("@/hooks/usePlayItem", () => ({ usePlayItem: () => mockPlay }));
const mockPush = jest.fn();
jest.mock("@/hooks/useAppRouter", () => {
  const router = { push: (href: unknown) => mockPush(href) };
  return { __esModule: true, default: () => router };
});
// The poster is the shared pressable with the long-press menu; not under test.
jest.mock("@/components/common/TouchableItemRouter", () => ({
  TouchableItemRouter: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const MINUTE = 600_000_000;
const EPISODE: BaseItemDto = {
  Id: "e6",
  Type: "Episode",
  Name: "My Old Lady",
  SeriesId: "scrubs",
  ParentIndexNumber: 1,
  IndexNumber: 4,
  RunTimeTicks: 22 * MINUTE,
  UserData: { PlaybackPositionTicks: 7 * MINUTE } as BaseItemDto["UserData"],
};

const setup = async (items: BaseItemDto[], onSettled?: () => void) => {
  const store = createStore();
  const api = makeApi({ Items: items });
  store.set(apiAtom, api as never);
  store.set(userAtom, { Id: "user-1" } as never);
  await render(
    <QueryWrapper>
      <JotaiProvider store={store}>
        <UpNextCard seriesId='scrubs' onSettled={onSettled} />
      </JotaiProvider>
    </QueryWrapper>,
  );
};

describe("UpNextCard", () => {
  beforeEach(() => {
    mockPlay.mockClear();
    mockPush.mockClear();
  });

  // The show page had no way to pick up where you left off without going
  // to the episode page (#6).
  test("resumes the next episode from the show page", async () => {
    await setup([EPISODE]);

    expect(await screen.findByText("S1 E4 · My Old Lady")).toBeTruthy();
    expect(screen.getByText("item_card.preview.minutes_left")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("item_card.resume_playback"));
    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "e6" }),
    );
  });

  test("offers Play for an episode not started", async () => {
    await setup([{ ...EPISODE, UserData: undefined }]);

    fireEvent.press(await screen.findByLabelText("common.play"));
    expect(mockPlay).toHaveBeenCalled();
  });

  test("opens the episode's page for its versions, audio and subtitles", async () => {
    await setup([EPISODE]);

    fireEvent.press(await screen.findByLabelText("item_card.more_details"));
    expect(mockPush).toHaveBeenCalled();
  });

  // The show page waits for it before showing its body, all at once.
  test("says when it knows, even when nothing is next", async () => {
    const onSettled = jest.fn();
    await setup([], onSettled);

    await waitFor(() => expect(onSettled).toHaveBeenCalled());
  });

  test("shows nothing when nothing is next", async () => {
    await setup([]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("item_card.next_up")).toBeNull();
  });
});
