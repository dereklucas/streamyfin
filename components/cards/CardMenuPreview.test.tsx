import { render, screen } from "@testing-library/react-native";
import type { CardData } from "./CardData";
import { CardMenuPreview } from "./CardMenuPreview";

const card = (extra: Partial<CardData>): CardData => ({
  id: "x",
  title: "Card title",
  subtitle: "Card subtitle",
  ...extra,
});

describe("CardMenuPreview", () => {
  test("a movie shows its poster, and the time left, not its lines", async () => {
    await render(
      <CardMenuPreview
        card={card({ preview: { kind: "poster", minutesLeft: 47 } })}
        kind='portrait'
      />,
    );

    expect(screen.queryByText("Card title")).toBeNull();
    expect(screen.getByText("item_card.preview.minutes_left")).toBeTruthy();
  });

  test("an episode shows its show, number, title, state and overview", async () => {
    await render(
      <CardMenuPreview
        card={card({
          preview: {
            kind: "episode",
            heading: "Scrubs",
            episodeNumber: "S2 E5",
            title: "My Best Friend's Birthday",
            watched: true,
            runtimeMinutes: 22,
            overview: "J.D. forgets Turk's birthday.",
          },
        })}
        kind='wide'
      />,
    );

    expect(screen.getByText("Scrubs")).toBeTruthy();
    expect(screen.getByText("S2 E5 · My Best Friend's Birthday")).toBeTruthy();
    expect(
      screen.getByText("item_card.preview.watched · item_card.preview.runtime"),
    ).toBeTruthy();
    expect(screen.getByText("J.D. forgets Turk's birthday.")).toBeTruthy();
  });

  test("a show counts what is left to watch", async () => {
    await render(
      <CardMenuPreview
        card={card({
          preview: {
            kind: "series",
            title: "Scrubs",
            year: 2001,
            unwatched: 12,
          },
        })}
        kind='portrait'
      />,
    );

    expect(screen.getByText("Scrubs")).toBeTruthy();
    expect(screen.getByText("2001 · item_card.preview.unwatched")).toBeTruthy();
  });

  test("anything else keeps the card's own lines", async () => {
    await render(<CardMenuPreview card={card({})} kind='portrait' />);

    expect(screen.getByText("Card title")).toBeTruthy();
    expect(screen.getByText("Card subtitle")).toBeTruthy();
  });
});
