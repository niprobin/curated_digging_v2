import { Button } from "@/components/ui/button";
import { PLAYLIST_OPTIONS, type PlaylistOption } from "@/components/playlist/playlist-options";
import clsx from "clsx";
import { useEffect } from "react";

/**
 * Track information for the playlist drawer
 */
export interface PlaylistDrawerTrack {
  /** Track title */
  title: string;
  /** Track artist */
  artist: string;
}

/**
 * Props for the PlaylistDrawer component
 */
interface PlaylistDrawerProps {
  /** Track to add to playlist (null means drawer is closed) */
  track: PlaylistDrawerTrack | null;
  /** Currently selected playlist */
  selectedPlaylist: PlaylistOption | null;
  /** Callback when a playlist is selected */
  onSelectPlaylist: (playlist: PlaylistOption) => void;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Callback to submit the selection */
  onSubmit: () => void;
  /** Whether the submission is in progress */
  isSubmitting: boolean;
  /** Error message to display (if any) */
  error: string | null;
}

/**
 * Shared playlist drawer component
 *
 * This component renders a slide-in drawer that allows users to select
 * a playlist to add a track to. It's used in both album and track views.
 *
 * Features:
 * - Slide-in from right
 * - Backdrop with blur
 * - Keyboard navigation (Escape to close)
 * - Loading state during submission
 * - Error display
 *
 * @example
 * ```tsx
 * const [track, setTrack] = useState<PlaylistDrawerTrack | null>(null);
 * const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistOption | null>(null);
 *
 * <PlaylistDrawer
 *   track={track}
 *   selectedPlaylist={selectedPlaylist}
 *   onSelectPlaylist={setSelectedPlaylist}
 *   onClose={() => setTrack(null)}
 *   onSubmit={handleSubmit}
 *   isSubmitting={false}
 *   error={null}
 * />
 * ```
 */
export function PlaylistDrawer({
  track,
  selectedPlaylist,
  onSelectPlaylist,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: PlaylistDrawerProps) {
  // Handle Escape key to close drawer
  useEffect(() => {
    if (!track) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [track, onClose]);

  // Don't render if no track
  if (!track) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-playlist-title"
        className="relative ml-auto flex h-full w-full max-w-md flex-col gap-6 bg-background p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-to-playlist-title" className="text-xl font-semibold">
              Add to playlist
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {track.title}
              <span className="px-2 text-muted-foreground">-</span>
              {track.artist}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Playlist selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Select a playlist</p>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {PLAYLIST_OPTIONS.map((option) => {
              const selected = selectedPlaylist === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectPlaylist(option)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card/60 hover:border-primary/60 hover:bg-card"
                  )}
                >
                  <span className="font-medium">{option.trim()}</span>
                  {selected ? (
                    <i className="fa-solid fa-circle-check text-primary-foreground" aria-hidden />
                  ) : (
                    <i className="fa-regular fa-circle" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="rounded-md border border-rose-300/60 bg-rose-50 p-2 text-sm text-rose-900">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!selectedPlaylist || isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to playlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
