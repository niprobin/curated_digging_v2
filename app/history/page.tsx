import { HistoryView } from "@/components/history/history-view";
import { getAlbumEntries, getPlaylistEntries } from "@/lib/data";
import { RefreshButton } from "@/components/refresh/refresh-button";

export default async function HistoryPage() {
  const [tracks, albums] = await Promise.all([getPlaylistEntries(), getAlbumEntries()]);
  const likedTracks = tracks.filter((t) => t.liked);
  const likedAlbums = albums.filter((a) => a.liked);
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your liked history</h1>
        <p className="text-sm text-muted-foreground">
          Your saved songs and albums pulled directly from source data.
        </p>
        <div>
          <RefreshButton tags={["playlists", "albums"]} />
        </div>
      </header>
      <HistoryView likedTracks={likedTracks} likedAlbums={likedAlbums} />
    </section>
  );
}
