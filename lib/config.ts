/**
 * Centralized configuration for the Curated Digging application
 *
 * This file contains all webhook URLs, data source URLs, storage keys,
 * and feature flags used throughout the application.
 */

/**
 * Webhook endpoints for n8n automation
 */
export const WEBHOOKS = {
  /** Add a track to a playlist */
  addToPlaylist: "https://n8n.niprobin.com/webhook/add-to-playlist",
  /** Mark a track as checked */
  trackChecked: "https://n8n.niprobin.com/webhook/track-checked",
  /** Get streaming URL for a track */
  getTrackUrl: "https://n8n.niprobin.com/webhook/get-track-url",
  /** Get track list for an album */
  getAlbumTracks: "https://n8n.niprobin.com/webhook/get-albums-tracks",
  /** Album actions (rate, dismiss, etc.) */
  albumAction: "https://n8n.niprobin.com/webhook/album-webhook",
} as const;

/**
 * Data source URLs (Google Sheets via Opensheet)
 */
export const DATA_SOURCES = {
  /** Curated tracks from various curators */
  playlists: "https://opensheet.elk.sh/1UUsfw3UMcHcJUYWoLYZmwiS7nDFc98oM08pgtfx2GOg/curators_tracks",
  /** Album releases list */
  albums: "https://opensheet.elk.sh/1UUsfw3UMcHcJUYWoLYZmwiS7nDFc98oM08pgtfx2GOg/albums_list",
} as const;

/**
 * LocalStorage keys for client-side persistence
 */
export const STORAGE_KEYS = {
  /** Album ratings (1-5 stars) */
  albumRatings: "curated-digging:album-ratings",
  /** Dismissed album IDs */
  albumDismissed: "curated-digging:album-dismissed",
  /** Bookmarked album IDs */
  albumBookmarks: "curated-digging:album-bookmarks",
  /** Show only bookmarked albums filter state */
  albumBookmarkFilter: "curated-digging:album-bookmark-filter",
} as const;

/**
 * External service URL builders
 */
export const EXTERNAL_SERVICES = {
  /** Generate YAMS.TF search URL */
  yamsSearch: (query: string) => `https://yams.tf/#/search/${encodeURIComponent(query)}`,
  /** Generate Spotify track URL */
  spotifyTrack: (id: string) => `https://open.spotify.com/track/${id}`,
} as const;

/**
 * Feature flags
 */
export const FEATURES = {
  /** Enable/disable audio streaming functionality */
  streamingEnabled: true,
} as const;

/**
 * Cache configuration for data fetching
 */
export const CACHE_CONFIG = {
  /** Revalidation time in seconds (30 minutes) */
  revalidateTime: 60 * 30,
} as const;
