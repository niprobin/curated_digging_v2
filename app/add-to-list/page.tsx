import type { Metadata } from "next";
import { AddToListForm } from "@/components/add-to-list/add-to-list-form";
import { AddToSongsForm } from "@/components/add-to-list/add-to-songs-form";

export const metadata: Metadata = {
  title: "Add to List - Curated Digging",
  description: "Send new albums or releases directly to your workflow.",
};

export default function AddToListPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Add to List</h1>
        <p className="text-sm text-muted-foreground">
          Drop any release name below. We will forward it to your automation workflow instantly.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Add to albums</h2>
          <AddToListForm />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add to songs</h2>
          <AddToSongsForm />
        </div>
      </div>
    </section>
  );
}
