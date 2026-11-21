import { contextMenuSections } from "./contextMenuSections";

describe("contextMenuSections", () => {
  test("orders the icon row, the list, navigation and the destructive end", () => {
    expect(
      contextMenuSections([
        { key: "delete", label: "Delete", destructive: true },
        { key: "goToSeries", label: "Go to show", group: "nav" },
        { key: "play", label: "Play", systemImage: "play.fill" },
        {
          key: "favorite",
          label: "Add to favorites",
          shortLabel: "Favorite",
          systemImage: "heart",
          group: "quick",
        },
      ]),
    ).toEqual([
      {
        kind: "quick",
        items: [
          {
            key: "favorite",
            label: "Favorite",
            systemImage: "heart",
            destructive: false,
          },
        ],
      },
      {
        kind: "list",
        items: [
          {
            key: "play",
            label: "Play",
            systemImage: "play.fill",
            destructive: false,
          },
        ],
      },
      {
        kind: "list",
        items: [{ key: "goToSeries", label: "Go to show", destructive: false }],
      },
      {
        kind: "list",
        items: [{ key: "delete", label: "Delete", destructive: true }],
      },
    ]);
  });

  test("leaves out the sections it has nothing for", () => {
    expect(
      contextMenuSections([{ key: "played", label: "Mark as played" }]),
    ).toEqual([
      {
        kind: "list",
        items: [{ key: "played", label: "Mark as played", destructive: false }],
      },
    ]);
  });
});
