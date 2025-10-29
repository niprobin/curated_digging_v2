import { AlbumView } from "@/components/albums/album-view";
import { getAlbumEntries } from "@/lib/data";

export const dynamic = "force-static";

export default async function AlbumsPage() {
  const entries = await getAlbumEntries();

  return <AlbumView entries={entries} />;
}
