import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";

/**
 * The entries a queue can play: a missing or unaired episode is listed by the
 * server as a "Virtual" placeholder, with no media file behind it.
 */
export const playableQueueItems = (candidates: BaseItemDto[]): BaseItemDto[] =>
  candidates.filter((item) => item.Id && item.LocationType !== "Virtual");
