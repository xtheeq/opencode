import type { ThemeColors } from "./tokens";

function createColors(colors: {
  background: ThemeColors["background"];
  text: ThemeColors["text"];
  border: ThemeColors["border"];
  icon: ThemeColors["icon"];
  action: ThemeColors["action"];
  status: ThemeColors["status"];
}): ThemeColors {
  return {
    ...colors,
  };
}

export const lightColors = createColors({
  background: {
    default: "#ffffff",
    surface: "#fafafa",
    elevated: "#eeeeee",
    subtle: "#f2f2f2",
    inset: "#f2f2f2",
    inverse: "#242424",
    contrast: "#2e2e2e",
    accent: "#3b5cf6",
  },
  text: {
    primary: "#161616",
    secondary: "#5c5c5c",
    muted: "#808080",
    accent: "#3b5cf6",
    disabled: "#aeaeae",
    inverse: "#fafafa",
    success: "#198b43",
    warning: "#8e7231",
    error: "#b82d35",
    info: "#623be2",
  },
  border: {
    default: "#0000001a",
    strong: "#00000033",
    subtle: "#00000014",
    focus: "#7698fd",
    error: "#f2bbb7",
    success: "#b8e9c1",
    warning: "#f7e5b5",
    info: "#d7e2fc",
  },
  icon: {
    default: "#3a3a3a",
    accent: "#3b5cf6",
    muted: "#808080",
    inverse: "#fafafa",
    success: "#198b43",
    warning: "#cb9f34",
    error: "#b82d35",
    info: "#623be2",
  },
  action: {
    primary: "#3b5cf6",
    primaryHover: "#3250df",
    primaryPressed: "#2c47c8",
    primaryText: "#ffffff",
    secondary: "#fafafa",
    secondaryHover: "#0000000a",
    secondaryPressed: "#00000014",
    destructive: "#b82d35",
    disabled: "#aeaeae",
  },
  status: {
    success: "#198b43",
    successBackground: "#e7f9ea",
    warning: "#8e7231",
    warningBackground: "#fefaec",
    error: "#b82d35",
    errorBackground: "#fceceb",
    info: "#2c47c8",
    infoBackground: "#ecf1fe",
  },
});

export const darkColors = createColors({
  background: {
    default: "#242424",
    surface: "#2e2e2e",
    elevated: "#3a3a3a",
    subtle: "#161616",
    inset: "#161616",
    inverse: "#fafafa",
    contrast: "#5c5c5c",
    accent: "#3b5cf6",
  },
  text: {
    primary: "#fafafa",
    secondary: "#aeaeae",
    muted: "#808080",
    accent: "#a2bcff",
    disabled: "#5c5c5c",
    inverse: "#242424",
    success: "#6bd586",
    warning: "#f2cf76",
    error: "#f17471",
    info: "#a2bcff",
  },
  border: {
    default: "#ffffff1a",
    strong: "#ffffff33",
    subtle: "#ffffff14",
    focus: "#7698fd",
    error: "#7a1f23",
    success: "#196130",
    warning: "#8e7231",
    info: "#1c2e70",
  },
  icon: {
    default: "#dbdbdb",
    accent: "#a2bcff",
    muted: "#808080",
    inverse: "#242424",
    success: "#6bd586",
    warning: "#f2cf76",
    error: "#f17471",
    info: "#a2bcff",
  },
  action: {
    primary: "#3b5cf6",
    primaryHover: "#7698fd",
    primaryPressed: "#2c47c8",
    primaryText: "#ffffff",
    secondary: "#ffffff0f",
    secondaryHover: "#ffffff0f",
    secondaryPressed: "#ffffff1a",
    destructive: "#f17471",
    disabled: "#5c5c5c",
  },
  status: {
    success: "#6bd586",
    successBackground: "#14361d",
    warning: "#f2cf76",
    warningBackground: "#4b4025",
    error: "#f17471",
    errorBackground: "#461516",
    info: "#a2bcff",
    infoBackground: "#1b2852",
  },
});
