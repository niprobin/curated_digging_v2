import { OverviewDashboard } from "@/components/overview/overview-dashboard";
import { getAlbumEntries, getPlaylistEntries } from "@/lib/data";

export const dynamic = "force-static";

export default async function HomePage() {
  const [playlistEntries, albumEntries] = await Promise.all([
    getPlaylistEntries(),
    getAlbumEntries(),
  ]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Curated Music To-do
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Keep tabs on the latest tracks and albums from playlists and artists you care about. Filters stay in sync as
          you move between sections, so your listening queue always feels organised.
        </p>
      </header>
      <OverviewDashboard playlists={playlistEntries} albums={albumEntries} />
    </section>
  );
}
