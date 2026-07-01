import { getConfig } from "./config";

export type ThemeName = "matrix" | "default" | "dark" | "colorful";

export type InkColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray";

export interface Theme {
  name: ThemeName;
  bg: InkColor;
  primary: InkColor;
  header: InkColor;
  accent: InkColor;
  muted: InkColor;
  error: InkColor;
  border: InkColor;
  borderActive: InkColor;
  outgoing: InkColor;
  incoming: InkColor;
}

const MATRIX_THEME: Theme = {
  name: "matrix",
  bg: "black",
  primary: "green",
  header: "cyan",
  accent: "yellow",
  muted: "gray",
  error: "red",
  border: "cyan",
  borderActive: "green",
  outgoing: "green",
  incoming: "gray",
};

const DEFAULT_THEME: Theme = {
  name: "default",
  bg: "black",
  primary: "white",
  header: "cyan",
  accent: "yellow",
  muted: "gray",
  error: "red",
  border: "green",
  borderActive: "green",
  outgoing: "green",
  incoming: "gray",
};

const DARK_THEME: Theme = {
  name: "dark",
  bg: "black",
  primary: "white",
  header: "blue",
  accent: "yellow",
  muted: "gray",
  error: "red",
  border: "blue",
  borderActive: "cyan",
  outgoing: "cyan",
  incoming: "gray",
};

const COLORFUL_THEME: Theme = {
  name: "colorful",
  bg: "black",
  primary: "magenta",
  header: "cyan",
  accent: "yellow",
  muted: "gray",
  error: "red",
  border: "magenta",
  borderActive: "green",
  outgoing: "green",
  incoming: "blue",
};

const THEMES: Record<ThemeName, Theme> = {
  matrix: MATRIX_THEME,
  default: DEFAULT_THEME,
  dark: DARK_THEME,
  colorful: COLORFUL_THEME,
};

export function resolveThemeName(name: string): ThemeName {
  if (name in THEMES) {
    return name as ThemeName;
  }
  return "matrix";
}

export function getTheme(name?: string): Theme {
  const themeName = resolveThemeName(name ?? getConfig().theme);
  return THEMES[themeName];
}

export function useTheme(): Theme {
  return getTheme();
}
