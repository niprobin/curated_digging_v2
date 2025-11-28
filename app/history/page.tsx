type SheetRow = {
  track?: string;
  date_liked?: string;
  playlist?: string;
  downloaded?: string;
  downloaded_track?: string;
  ["downloaded track"]?: string;
};

type HistoryEntry = {
  track: string;
  dateLiked: string;
  playlist: string;
  downloadedTrack: string;
  matchScore: number;
};

const HISTORY_SOURCE =
  "https://opensheet.elk.sh/19q7ac_1HikdJK_mAoItd65khDHi0pNCR8PrdIcR6Fhc/2";

function parseDateValue(value?: string): number {
  if (!value) return 0;
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return 0;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return 0;
  return new Date(y, m - 1, d).getTime();
}

function tokenize(value?: string): string[] {
  if (!value) return [];
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];
  return normalized.split(" ").sort();
}

function calculateMatchScore(track?: string, downloaded?: string): number {
  const tokensA = tokenize(track);
  const tokensB = tokenize(downloaded);
  if (!tokensA.length && !tokensB.length) return 1;
  if (!tokensA.length || !tokensB.length) return 0;
  let matches = 0;
  let i = 0;
  let j = 0;
  while (i < tokensA.length && j < tokensB.length) {
    if (tokensA[i] === tokensB[j]) {
      matches++;
      i++;
      j++;
    } else if (tokensA[i] < tokensB[j]) {
      i++;
    } else {
      j++;
    }
  }
  const maxLength = Math.max(tokensA.length, tokensB.length);
  return maxLength === 0 ? 1 : matches / maxLength;
}

async function getHistoryEntries(): Promise<HistoryEntry[]> {
  const response = await fetch(HISTORY_SOURCE, {
    next: { revalidate: 300, tags: ["history"] },
  });
  if (!response.ok) {
    throw new Error(`Failed to load history: ${response.status}`);
  }
  const rows = (await response.json()) as SheetRow[];
  const parsed = rows
    .filter((row) => String(row.downloaded).toLowerCase() === "true")
    .map((row) => ({
      track: (row.track ?? "").trim(),
      dateLiked: row.date_liked ?? "",
      playlist: row.playlist ?? "",
      downloadedTrack: (row["downloaded track"] ?? row.downloaded_track ?? "").trim(),
      matchScore: calculateMatchScore(row.track, row["downloaded track"] ?? row.downloaded_track),
      sortKey: parseDateValue(row.date_liked),
    }));
  parsed.sort((a, b) => b.sortKey - a.sortKey);
  return parsed.map(({ sortKey, ...entry }) => entry);
}

export default async function HistoryPage() {
  const entries = await getHistoryEntries();
  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Downloaded history</h1>
        <a
          href="https://docs.google.com/spreadsheets/d/19q7ac_1HikdJK_mAoItd65khDHi0pNCR8PrdIcR6Fhc/edit?gid=185091005#gid=185091005"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded bg-muted text-white transition hover:bg-foreground"
          title="Open Google Sheet"
        >
          <i className="fa-solid fa-up-right-from-square" aria-hidden />
          <span className="sr-only">Open Google Sheet</span>
        </a>
      </header>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Track</th>
              <th className="px-3 py-2 font-medium">Date liked</th>
              <th className="px-3 py-2 font-medium">Playlist</th>
              <th className="px-3 py-2 font-medium">Downloaded track</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.track}-${entry.dateLiked}-${index}`}
                className={
                  entry.matchScore < 0.5
                    ? "bg-[#ef4444]/30 text-foreground"
                    : entry.matchScore < 1
                      ? "bg-[#FFB900]/25 text-foreground"
                      : index % 2 === 0
                        ? "bg-background"
                        : "bg-muted/10"
                }
              >
                <td className="px-3 py-2 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span>{entry.track || "-"}</span>
                    {entry.matchScore < 1 && (
                      <span
                        className="inline-flex h-2 w-2 rounded-full bg-amber-400"
                        title="Track differs from downloaded entry"
                        aria-label="Track differs from downloaded entry"
                      />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{entry.dateLiked || "-"}</td>
                <td className="px-3 py-2">{entry.playlist || "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{entry.downloadedTrack || "-"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                  No downloaded entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
