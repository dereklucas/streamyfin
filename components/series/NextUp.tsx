import { getShowApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import type React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CardRow } from "@/components/cards/CardRow";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";

export const NextUp: React.FC<{
  seriesId: string;
  /** Told once it is known whether there is anything next. */
  onSettled?: () => void;
}> = ({ seriesId, onSettled }) => {
  const [user] = useAtom(userAtom);
  const [api] = useAtom(apiAtom);
  const { t } = useTranslation();

  const { data: items, isLoading } = useQuery({
    queryKey: ["nextUp", seriesId],
    queryFn: async () => {
      if (!api) return null;
      return (
        await getShowApi(api).getNextUp({
          userId: user?.Id,
          seriesId,
          fields: ["MediaSourceCount"],
          limit: 10,
        })
      ).data.Items;
    },
    enabled: !!api && !!seriesId && !!user?.Id,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isLoading) onSettled?.();
  }, [isLoading, onSettled]);

  return (
    <CardRow
      enableActionSheet
      title={t("item_card.next_up")}
      kind='wide'
      items={items ?? []}
      useEpisodePoster
      loading={isLoading}
      // A finished show, or one not started, has nothing next: no section.
      hideIfEmpty
      className='mb-4'
    />
  );
};
