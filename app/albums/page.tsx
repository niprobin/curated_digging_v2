import { AlbumView } from "@/components/albums/album-view";
import { RefreshButton } from "@/components/refresh/refresh-button";
import { AddAlbumButton } from "@/components/albums/add-album-button";
import { getAlbumEntries } from "@/lib/data";

export const dynamic = "force-static";

export default async function AlbumsPage() {
  const entries = await getAlbumEntries();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Curated albums</h1>
          <AddAlbumButton />
        </div>
        <p className="text-sm text-muted-foreground">
          Discover the latest long plays and releases you&apos;ve hand-picked to follow.
        </p>
        <div>
          <RefreshButton tag="albums" />
        </div>
      </header>
      <AlbumView entries={entries} />
    </section>
  );
}
