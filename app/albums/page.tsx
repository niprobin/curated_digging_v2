import { AlbumView } from "@/components/albums/album-view";
import { getAlbumEntries } from "@/lib/data";

export const dynamic = "force-static";

export default async function AlbumsPage() {
  const entries = await getAlbumEntries();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Curated albums</h1>
        <p className="text-sm text-muted-foreground">
          Discover the latest long plays and releases you&apos;ve hand-picked to follow.
        </p>
      </header>
      <AlbumView entries={entries} />
    </section>
  );
}
