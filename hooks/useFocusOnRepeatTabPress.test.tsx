import { act, renderHook } from "@testing-library/react-native";
import { eventBus } from "@/utils/eventBus";
import { useFocusOnRepeatTabPress } from "./useFocusOnRepeatTabPress";

let mockFocused = false;
jest.mock("expo-router", () => ({
  useNavigation: () => ({ isFocused: () => mockFocused }),
}));

const setup = async () => {
  const focus = jest.fn();
  const ref = { current: { focus } };
  await renderHook(() => useFocusOnRepeatTabPress(ref, "searchTabPressed"));
  return focus;
};

describe("useFocusOnRepeatTabPress", () => {
  // Switching to Search from another tab focused the field and raised the
  // keyboard over the landing page.
  test("leaves the field alone when the tab is switched to", async () => {
    mockFocused = false;
    const focus = await setup();

    await act(async () => eventBus.emit("searchTabPressed"));

    expect(focus).not.toHaveBeenCalled();
  });

  test("focuses the field when the tab is pressed again", async () => {
    mockFocused = true;
    const focus = await setup();

    await act(async () => eventBus.emit("searchTabPressed"));

    expect(focus).toHaveBeenCalled();
  });
});
