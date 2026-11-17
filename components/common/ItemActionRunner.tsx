import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useEffect, useRef } from "react";
import { useItemActions } from "@/hooks/useItemActionSheet";
import type { ItemActionKey } from "@/utils/itemActions";

type Props = {
  item: BaseItemDto;
  action: ItemActionKey;
  onDone: () => void;
};

/**
 * Runs one long-press action for one item, then calls `onDone`. The native
 * context menu describes every poster's actions as plain data; the hooks that
 * run them mount here, once, for the poster whose action was chosen. Keyed per
 * choice by the caller, like ItemActionSheetHost.
 */
export const ItemActionRunner: React.FC<Props> = ({ item, action, onDone }) => {
  const { run } = useItemActions(item);
  const started = useRef(false);
  const mounted = useRef(true);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run(action).finally(() => {
      if (mounted.current) onDoneRef.current();
    });
  }, [run, action]);

  return null;
};
