import { act, renderHook } from "@testing-library/react-native";
import { useRevealWhenReady } from "./useRevealWhenReady";

describe("useRevealWhenReady", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // The show page filled in section by section, each one moving the rest:
  // its body now shows once its sections have settled.
  test("reveals once every part is ready", async () => {
    const { result, rerender } = await renderHook(
      ({ ready }: { ready: boolean[] }) => useRevealWhenReady(ready, 2000),
      { initialProps: { ready: [true, false] } },
    );
    expect(result.current).toBe(false);

    await rerender({ ready: [true, true] });

    expect(result.current).toBe(true);
  });

  // A part that never settles (a request that hangs) must not hide the page.
  test("reveals anyway after the timeout", async () => {
    const { result } = await renderHook(() =>
      useRevealWhenReady([false], 2000),
    );

    await act(async () => jest.advanceTimersByTime(2000));

    expect(result.current).toBe(true);
  });

  // Once shown, a part loading again (a refetch) does not hide it.
  test("stays revealed", async () => {
    const { result, rerender } = await renderHook(
      ({ ready }: { ready: boolean[] }) => useRevealWhenReady(ready, 2000),
      { initialProps: { ready: [true] } },
    );

    await rerender({ ready: [false] });

    expect(result.current).toBe(true);
  });
});
