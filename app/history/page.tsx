import { HistoryView } from "@/components/history/history-view";

export default function HistoryPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your liked history</h1>
        <p className="text-sm text-muted-foreground">
          Every time you save an item we keep it here, so you can revisit favourites or track what you removed.
        </p>
      </header>
      <HistoryView />
    </section>
  );
}
