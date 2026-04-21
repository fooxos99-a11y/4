export type LeaderboardTheme = {
  primary: string
  secondary: string
  tertiary: string
}

export type LeaderboardCrownTheme = {
  primary: string
  secondary: string
  border: string
  glow: string
}

const LOCKED_RANK_THEMES: LeaderboardTheme[] = [
  { primary: "#f4c542", secondary: "#d4a017", tertiary: "#9c6f00" },
  { primary: "#7f8b99", secondary: "#aeb8c5", tertiary: "#566171" },
  { primary: "#cd7f32", secondary: "#a85d1a", tertiary: "#7a3e0c" },
]

const DEFAULT_NEUTRAL_THEME: LeaderboardTheme = {
  primary: "#3453a7",
  secondary: "#4f73d1",
  tertiary: "#20335f",
}

const LEADERBOARD_CROWN_THEMES: LeaderboardCrownTheme[] = [
  { primary: "#f6d66c", secondary: "#c79211", border: "#c79a22", glow: "rgba(245, 194, 66, 0.56)" },
  { primary: "#ffffff", secondary: "#8a97ab", border: "#4f5d73", glow: "rgba(214, 224, 236, 0.9)" },
  { primary: "#d6a071", secondary: "#8c5526", border: "#9a6333", glow: "rgba(205, 127, 50, 0.54)" },
]

export function isLockedLeaderboardRank(index: number) {
  return index >= 0 && index < 3
}

export function getLockedLeaderboardTheme(index: number) {
  return LOCKED_RANK_THEMES[index] ?? DEFAULT_NEUTRAL_THEME
}

export function getDefaultLeaderboardTheme() {
  return DEFAULT_NEUTRAL_THEME
}

export function getLeaderboardCrownTheme(index: number) {
  return LEADERBOARD_CROWN_THEMES[index] ?? null
}