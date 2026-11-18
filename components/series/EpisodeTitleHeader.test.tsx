import { fireEvent, render, screen } from "@testing-library/react-native";
import { EpisodeTitleHeader } from "./EpisodeTitleHeader";

const mockPush = jest.fn();
jest.mock("@/hooks/useAppRouter", () => {
  const router = { push: (href: unknown) => mockPush(href) };
  return { __esModule: true, default: () => router };
});

const EPISODE = {
  Id: "e4",
  Type: "Episode" as const,
  Name: "My Old Lady",
  SeriesId: "scrubs",
  SeriesName: "Scrubs",
  SeasonName: "Season 1",
  ParentIndexNumber: 1,
  IndexNumber: 4,
};

describe("EpisodeTitleHeader", () => {
  // The episode page had no plain way back to the show (#6): the season name
  // was the only link, and it did not read as one.
  test("names the show, and opens it", async () => {
    await render(<EpisodeTitleHeader item={EPISODE} />);

    fireEvent.press(screen.getByText("Scrubs"));

    expect(mockPush).toHaveBeenCalledWith("/(auth)/series/scrubs");
  });

  test("still opens the season from its name", async () => {
    await render(<EpisodeTitleHeader item={EPISODE} />);

    fireEvent.press(screen.getByText("Season 1"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(auth)/series/scrubs?seasonIndex=1",
    );
  });
});
