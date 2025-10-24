import { PlaylistView } from "@/components/playlist/playlist-view";
import { getCurators, getPlaylistEntries } from "@/lib/data";
import { RefreshButton } from "@/components/refresh/refresh-button";

export const dynamic = "force-static";

export default async function PlaylistsPage() {
  const entries = await getPlaylistEntries();
  const curators = getCurators(entries);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Curators playlists</h1>
        <p className="text-sm text-muted-foreground">
          Browse new additions from your trusted curators. Filters stay with you as you switch views.
        </p>
        <div>
          <RefreshButton tag="playlists" />
        </div>
      </header>
      <PlaylistView entries={entries} curators={curators} />
    </section>
  );
}
