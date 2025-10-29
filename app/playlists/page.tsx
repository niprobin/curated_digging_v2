import { PlaylistView } from "@/components/playlist/playlist-view";
import { getCurators, getPlaylistEntries } from "@/lib/data";

export const dynamic = "force-static";

export default async function PlaylistsPage() {
  const entries = await getPlaylistEntries();
  const curators = getCurators(entries);

  return <PlaylistView entries={entries} curators={curators} />;
}
