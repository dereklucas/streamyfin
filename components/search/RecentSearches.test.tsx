import { fireEvent, render, screen } from "@testing-library/react-native";
import { RecentSearches } from "./RecentSearches";

describe("RecentSearches", () => {
  test("runs a past search again", async () => {
    const onSelect = jest.fn();
    await render(
      <RecentSearches
        queries={["heat", "alien"]}
        onSelect={onSelect}
        onClear={() => {}}
      />,
    );

    fireEvent.press(screen.getByText("alien"));

    expect(onSelect).toHaveBeenCalledWith("alien");
  });

  test("clears them", async () => {
    const onClear = jest.fn();
    await render(
      <RecentSearches
        queries={["heat"]}
        onSelect={() => {}}
        onClear={onClear}
      />,
    );

    fireEvent.press(screen.getByLabelText("search.clear"));

    expect(onClear).toHaveBeenCalled();
  });

  test("shows nothing without past searches", async () => {
    await render(
      <RecentSearches queries={[]} onSelect={() => {}} onClear={() => {}} />,
    );

    expect(screen.queryByText("search.recent_searches")).toBeNull();
  });
});
