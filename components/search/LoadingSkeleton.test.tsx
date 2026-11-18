import { render, screen } from "@testing-library/react-native";

jest.mock(
  "react-native-reanimated",
  () => jest.requireActual("@/test-utils/reanimated").reanimatedModule,
);

import { LoadingSkeleton } from "./LoadingSkeleton";

describe("LoadingSkeleton", () => {
  // It drew 112×160 posters with text under them; the results are card rows.
  test("stands in for the result rows with the rows' own skeletons", async () => {
    await render(<LoadingSkeleton isLoading />);

    expect(screen.getAllByTestId("card-row-skeleton")).toHaveLength(3);
    expect(screen.getAllByTestId("section-header-placeholder")).toHaveLength(3);
  });
});
