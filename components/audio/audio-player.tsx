import { Button } from "@/components/ui/button";
import { fmtTime } from "@/lib/utils";
import type { AudioInfo } from "@/hooks/use-audio-player";

/**
 * Props for the AudioPlayer component
 */
interface AudioPlayerProps {
  /** Current audio information (null if no track loaded) */
  audioInfo: AudioInfo | null;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether a track is being loaded */
  isLoading: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current volume (0-1) */
  volume: number;
  /** Ref to the audio element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Toggle play/pause callback */
  onTogglePlay: () => void;
  /** Seek to a specific time callback */
  onSeek: (time: number) => void;
  /** Set volume callback */
  onVolumeChange: (volume: number) => void;
  /** Optional callback to add current track to playlist */
  onAddToPlaylist?: () => void;
  /** Optional className for styling */
  className?: string;
  /** Variant: "desktop" (with volume slider) or "mobile" (minimal) */
  variant?: "desktop" | "mobile";
}

/**
 * Shared audio player component
 *
 * This component renders the audio player UI and can be used in both
 * desktop (with full controls) and mobile (minimal) layouts.
 *
 * @example
 * ```tsx
 * const player = useAudioPlayer();
 *
 * <AudioPlayer
 *   {...player}
 *   onTogglePlay={player.togglePlay}
 *   onSeek={player.seek}
 *   onVolumeChange={player.setVolume}
 *   variant="desktop"
 * />
 * ```
 */
export function AudioPlayer({
  audioInfo,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  volume,
  audioRef,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onAddToPlaylist,
  className = "",
  variant = "desktop",
}: AudioPlayerProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={`grid h-full place-items-center text-muted-foreground ${className}`}>
        <i className="fa-solid fa-spinner fa-spin text-2xl" aria-hidden />
        <span className="sr-only">Loading track...</span>
      </div>
    );
  }

  // No track loaded
  if (!audioInfo) {
    return (
      <div className={`grid h-full place-items-center text-xs text-muted-foreground ${className}`}>
        Select a track to play
      </div>
    );
  }

  // Mobile variant - minimal player
  if (variant === "mobile") {
    return (
      <div className={`rounded-md border border-border bg-background/95 p-2 shadow-lg backdrop-blur ${className}`}>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="secondary"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{audioInfo.title}</p>
            <p className="truncate text-xs text-muted-foreground">{audioInfo.artist}</p>
          </div>
          {onAddToPlaylist && (
            <Button size="icon" variant="outline" onClick={onAddToPlaylist} aria-label="Add to playlist">
              <i className="fa-solid fa-plus" aria-hidden />
            </Button>
          )}
        </div>
        <audio ref={audioRef} src={audioInfo.url} className="hidden" />
      </div>
    );
  }

  // Desktop variant - full player with controls
  return (
    <div className={`grid h-full place-items-center p-4 ${className}`}>
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur">
        <div className="mb-4 text-center">
          <div className="truncate text-base font-semibold">{audioInfo.title}</div>
          <div className="truncate text-xs text-muted-foreground">{audioInfo.artist}</div>
        </div>
        <div className="flex flex-col items-center gap-4">
          {/* Play/Pause and Add buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-[1.03] active:scale-95"
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
            </button>
            {onAddToPlaylist && (
              <Button size="icon" variant="outline" onClick={onAddToPlaylist} aria-label="Add to playlist">
                <i className="fa-solid fa-plus" aria-hidden />
              </Button>
            )}
          </div>

          {/* Seek slider */}
          <div className="flex w-full items-center gap-3">
            <div className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">
              {fmtTime(currentTime)}
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Number.isFinite(currentTime) ? currentTime : 0}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Seek"
            />
            <div className="w-12 text-[11px] tabular-nums text-muted-foreground">
              {fmtTime(Math.max(0, (duration || 0) - (currentTime || 0)))}
            </div>
          </div>

          {/* Volume slider */}
          <div className="flex w-full items-center gap-2">
            <i className="fa-solid fa-volume-high text-muted-foreground" aria-hidden />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label="Volume"
            />
          </div>
        </div>
        <audio ref={audioRef} src={audioInfo.url} className="hidden" />
      </div>
    </div>
  );
}

/**
 * Compact audio player for bottom bars and sticky positions
 *
 * This is a horizontal layout optimized for sticky bottom bars on desktop.
 */
export function AudioPlayerBar({
  audioInfo,
  isPlaying,
  audioRef,
  onTogglePlay,
  onSeek,
  onAddToPlaylist,
  currentTime,
  duration,
  className = "",
}: Omit<AudioPlayerProps, "isLoading" | "volume" | "onVolumeChange" | "variant">) {
  if (!audioInfo) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Select a track to play
      </div>
    );
  }

  return (
    <div className={`mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2 ${className}`}>
      <Button
        size="icon"
        variant="secondary"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
      >
        <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} aria-hidden />
      </Button>
      {onAddToPlaylist && (
        <Button size="icon" variant="outline" onClick={onAddToPlaylist} aria-label="Add">
          <i className="fa-solid fa-plus" aria-hidden />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{audioInfo.title}</p>
        <p className="truncate text-xs text-muted-foreground">{audioInfo.artist}</p>
      </div>
      <div className="flex w-48 items-center gap-2 md:w-72">
        <span className="text-[11px] tabular-nums text-muted-foreground">{fmtTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded bg-border accent-foreground"
          aria-label="Seek"
        />
        <span className="text-[11px] tabular-nums text-muted-foreground">{fmtTime(duration)}</span>
      </div>
      <audio ref={audioRef} src={audioInfo.url} className="hidden" />
    </div>
  );
}
