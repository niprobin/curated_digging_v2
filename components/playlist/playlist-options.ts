export const PLAYLIST_OPTIONS = [
  "Afrobeat & Highlife",
  "Beats",
  "Bossa Nova",
  "Brazilian Music",
  "Disco Dancefloor",
  "DNB",
  "Downtempo Trip-hop",
  "Funk & Rock",
  "Hip-hop",
  "House Chill",
  "House Dancefloor",
  "Jazz Classic",
  "Jazz Funk",
  "Latin Music",
  "Morning Chill",
  "Neo Soul",
  "Reggae",
  "RNB Mood",
  "Soul Oldies",
] as const;

export type PlaylistOption = (typeof PLAYLIST_OPTIONS)[number];
