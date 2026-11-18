import { useLocalSearchParams } from "expo-router";
import { StudioPage } from "@/components/studios/StudioPage";

// Opened from the genre tiles on the phone's and iPad's search page; the TV's
// search has none. The request is covered by utils/jellyfin/search.test.ts.
export default function GenreRoute() {
  const { genreId } = useLocalSearchParams() as { genreId: string };
  return <StudioPage studioId={genreId} kind='genre' />;
}
