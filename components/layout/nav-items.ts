export type NavItem = {
  href: string;
  label: string;
  icon: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/playlists",
    label: "Tracks",
    icon: "fa-solid fa-music",
    description: "Browse playlist finds and queue them up.",
  },
  {
    href: "/albums",
    label: "Albums",
    icon: "fa-solid fa-compact-disc",
    description: "Catch every album you've saved to explore.",
  },
  {
    href: "/history",
    label: "History",
    icon: "fa-solid fa-heart",
    description: "Review the items you've liked recently.",
  },
  {
    href: "/add-to-list",
    label: "Add to List",
    icon: "fa-solid fa-plus",
    description: "Send new albums or songs to your workflow.",
  },
  {
    href: "/search-webhook",
    label: "Search",
    icon: "fa-solid fa-search",
    description: "Search using webhook endpoint.",
  },
];
