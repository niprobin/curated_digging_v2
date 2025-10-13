export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
      <i className="fa-solid fa-tower-cell text-4xl text-muted-foreground" aria-hidden />
      <h1 className="text-3xl font-semibold tracking-tight">You are offline</h1>
      <p className="text-sm text-muted-foreground">
        We could not refresh the latest playlists or albums. Once you reconnect, reload the app to sync your queue.
      </p>
    </section>
  );
}
