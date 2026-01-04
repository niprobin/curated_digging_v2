import { useState, useRef, useEffect, useCallback } from "react";
import { WEBHOOKS, FEATURES } from "@/lib/config";

/**
 * Audio information for the currently loaded track
 */
export interface AudioInfo {
  /** Streaming URL for the audio */
  url: string;
  /** Track title */
  title: string;
  /** Track artist */
  artist: string;
}

/**
 * Options for configuring the audio player
 */
interface UseAudioPlayerOptions {
  /** Callback invoked when a track ends */
  onTrackEnd?: () => void;
  /** Whether to auto-play tracks when loaded (defaults to true) */
  autoPlay?: boolean;
}

/**
 * Return type for the useAudioPlayer hook
 */
export interface UseAudioPlayerReturn {
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
  /** Play a track by fetching its streaming URL */
  playTrack: (artist: string, title: string, trackId?: string) => Promise<void>;
  /** Toggle play/pause */
  togglePlay: () => void;
  /** Seek to a specific time */
  seek: (time: number) => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Stop playback and clear current track */
  stop: () => void;
}

/**
 * Custom hook for managing audio playback with streaming URL fetching
 *
 * This hook handles:
 * - Fetching streaming URLs from the webhook
 * - Audio element lifecycle and event listeners
 * - Play/pause/seek/volume controls
 * - Loading and error states
 *
 * @param options - Configuration options
 * @returns Audio player controls and state
 *
 * @example
 * ```tsx
 * const player = useAudioPlayer({
 *   onTrackEnd: () => console.log('Track ended'),
 *   autoPlay: true,
 * });
 *
 * // Play a track
 * await player.playTrack('Artist Name', 'Track Title', 'spotify-id');
 *
 * // Toggle playback
 * player.togglePlay();
 *
 * // Seek to 30 seconds
 * player.seek(30);
 * ```
 */
export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Set up audio event listeners
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      options.onTrackEnd?.();
    };
    const handleTimeUpdate = () => setCurrentTime(el.currentTime || 0);
    const handleLoadedMetadata = () => setDuration(el.duration || 0);

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [options.onTrackEnd]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !FEATURES.streamingEnabled) return;

    if (el.paused) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback(
    (time: number) => {
      const el = audioRef.current;
      if (!el || !Number.isFinite(time)) return;

      const newTime = Math.min(Math.max(0, time), duration || 0);
      el.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const setVolume = useCallback((vol: number) => {
    const el = audioRef.current;
    const newVol = Math.min(Math.max(0, vol), 1);
    setVolumeState(newVol);
    if (el) el.volume = newVol;
  }, []);

  const playTrack = useCallback(
    async (artist: string, title: string, trackId?: string) => {
      if (!FEATURES.streamingEnabled) {
        throw new Error("Streaming is currently disabled");
      }

      try {
        setIsLoading(true);
        setAudioInfo(null);

        const params = new URLSearchParams({ artist, track: title });
        if (trackId) params.set("track_id", trackId);

        const response = await fetch(`${WEBHOOKS.getTrackUrl}?${params.toString()}`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }

        const data = (await response.json()) as {
          stream_url?: string;
          title?: string;
          artist?: string;
        };

        const streamUrl = data?.stream_url;
        if (!streamUrl) {
          throw new Error("Missing stream URL");
        }

        const resolvedTitle = data?.title?.trim() || title;
        const resolvedArtist = data?.artist?.trim() || artist;

        setAudioInfo({ url: streamUrl, title: resolvedTitle, artist: resolvedArtist });

        // Auto-play if enabled (default: true)
        if (options.autoPlay !== false) {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.volume = volume;
              audioRef.current.play().catch(() => setIsPlaying(false));
            }
          }, 50);
        }
      } catch (error) {
        console.error("Failed to fetch streaming URL", error);
        setAudioInfo(null);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options.autoPlay, volume]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioInfo(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return {
    audioInfo,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    audioRef,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    stop,
  };
}
