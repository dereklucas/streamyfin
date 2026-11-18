import { useEffect, useState } from "react";

/**
 * Whether a page's part that fills in from several requests can show: once
 * all of them have settled, so it appears whole instead of moving as each one
 * lands, or after `timeoutMs` whatever happens, so a request that hangs never
 * hides the page. Once shown it stays shown: a refetch does not hide it again.
 */
export const useRevealWhenReady = (
  ready: boolean[],
  timeoutMs: number,
): boolean => {
  const allReady = ready.every(Boolean);
  const [revealed, setRevealed] = useState(allReady);

  useEffect(() => {
    if (allReady) setRevealed(true);
  }, [allReady]);

  useEffect(() => {
    if (revealed) return;
    const timer = setTimeout(() => setRevealed(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [revealed, timeoutMs]);

  return revealed || allReady;
};
