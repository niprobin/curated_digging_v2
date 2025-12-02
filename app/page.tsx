import { OverviewDashboard } from "@/components/overview/overview-dashboard";
export const dynamic = "force-static";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Curated Digging</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Keep tabs on the latest tracks and albums from playlists and artists you care about.
        </p>
      </header>
      <OverviewDashboard />
    </section>
  );
}
