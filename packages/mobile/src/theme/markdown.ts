import type { ThemeColors } from "@/theme";
import type { MarkdownStyle } from "react-native-enriched-markdown";
import { spacing, borderRadius } from "@/theme";

const LINE_HEIGHT = 1.5;
const CODE_LINE_HEIGHT = 1.6;
const HEADING_LINE_HEIGHT = 1.25;
const CODE_FONT_SIZE_OFFSET = 2;

const HEADING_SCALE = {
  h1: 1.25,
  h2: 1.125,
  h3: 1,
  h4: 1,
  h5: 0.9375,
  h6: 0.875,
} as const;

const HEADING_WEIGHT = {
  primary: "600",
  secondary: "500",
} as const;

const HAIRLINE = 1;
const BLOCKQUOTE_BORDER = 3;
const BULLET_SIZE = 6;
const ICON_SIZE = 20;

export function markdownTheme(
  colors: ThemeColors,
  baseFontSize: number,
): MarkdownStyle {
  const bodyLineHeight = baseFontSize * LINE_HEIGHT;
  const codeFontSize = baseFontSize - CODE_FONT_SIZE_OFFSET;
  const codeLineHeight = codeFontSize * CODE_LINE_HEIGHT;

  return {
    paragraph: {
      color: colors.text.primary,
      fontSize: baseFontSize,
      fontWeight: "400",
      lineHeight: bodyLineHeight,
      marginTop: 0,
      marginBottom: spacing.xs,
      textAlign: "left",
    },
    h1: {
      color: colors.text.primary,
      fontWeight: HEADING_WEIGHT.primary,
      fontSize: baseFontSize * HEADING_SCALE.h1,
      lineHeight: baseFontSize * HEADING_SCALE.h1 * HEADING_LINE_HEIGHT,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      textAlign: "left",
    },
    h2: {
      color: colors.text.primary,
      fontWeight: HEADING_WEIGHT.primary,
      fontSize: baseFontSize * HEADING_SCALE.h2,
      lineHeight: baseFontSize * HEADING_SCALE.h2 * HEADING_LINE_HEIGHT,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      textAlign: "left",
    },
    h3: {
      color: colors.text.primary,
      fontWeight: HEADING_WEIGHT.secondary,
      fontSize: baseFontSize * HEADING_SCALE.h3,
      lineHeight: bodyLineHeight,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      textAlign: "left",
    },
    h4: {
      color: colors.text.secondary,
      fontWeight: HEADING_WEIGHT.secondary,
      fontSize: baseFontSize * HEADING_SCALE.h4,
      lineHeight: bodyLineHeight,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      textAlign: "left",
    },
    h5: {
      color: colors.text.secondary,
      fontWeight: HEADING_WEIGHT.secondary,
      fontSize: baseFontSize * HEADING_SCALE.h5,
      lineHeight: baseFontSize * HEADING_SCALE.h5 * HEADING_LINE_HEIGHT,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      textAlign: "left",
    },
    h6: {
      color: colors.text.secondary,
      fontWeight: HEADING_WEIGHT.secondary,
      fontSize: baseFontSize * HEADING_SCALE.h6,
      lineHeight: baseFontSize * HEADING_SCALE.h6 * HEADING_LINE_HEIGHT,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      textAlign: "left",
    },
    blockquote: {
      color: colors.text.secondary,
      backgroundColor: "transparent",
      borderColor: colors.border.default,
      borderWidth: BLOCKQUOTE_BORDER,
      gapWidth: spacing.sm,
      fontSize: baseFontSize,
      fontWeight: "400",
      lineHeight: bodyLineHeight,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    list: {
      color: colors.text.primary,
      fontSize: baseFontSize,
      fontWeight: "400",
      lineHeight: bodyLineHeight,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
      bulletColor: colors.text.secondary,
      bulletSize: BULLET_SIZE,
      markerColor: colors.text.secondary,
      markerFontWeight: "400",
      markerMinWidth: 0,
      gapWidth: spacing.xs,
      marginLeft: spacing.md,
    },
    codeBlock: {
      color: colors.text.primary,
      fontSize: codeFontSize,
      fontWeight: "400",
      lineHeight: codeLineHeight,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: colors.background.surface,
      borderColor: colors.border.default,
      borderWidth: HAIRLINE,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
    },
    code: {
      color: colors.text.primary,
      fontSize: codeFontSize,
      backgroundColor: colors.background.surface,
      borderColor: colors.background.surface,
    },
    link: {
      color: colors.text.accent,
      underline: true,
      backgroundColor: "transparent",
    },
    strong: {
      color: colors.text.primary,
      fontWeight: "bold",
    },
    em: {
      color: colors.text.primary,
      fontStyle: "italic",
    },
    strikethrough: { color: colors.text.secondary },
    thematicBreak: {
      color: colors.border.default,
      height: HAIRLINE,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    image: {
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    inlineImage: { size: ICON_SIZE },
    taskList: {
      borderColor: colors.border.default,
      checkedColor: colors.text.secondary,
      checkedTextColor: colors.text.secondary,
      checkmarkColor: colors.background.default,
      checkboxSize: ICON_SIZE,
      checkboxBorderRadius: borderRadius.sm,
      checkedStrikethrough: true,
    },
    table: {
      color: colors.text.primary,
      fontSize: codeFontSize,
      fontWeight: "400",
      lineHeight: codeFontSize * LINE_HEIGHT,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      borderColor: colors.border.default,
      borderWidth: HAIRLINE,
      borderRadius: borderRadius.md,
      headerTextColor: colors.text.primary,
      headerBackgroundColor: colors.background.surface,
      rowEvenBackgroundColor: colors.background.surface,
      rowOddBackgroundColor: "transparent",
      cellPaddingHorizontal: spacing.sm,
      cellPaddingVertical: spacing.xs,
    },
    spoiler: {
      color: colors.background.surface,
      solid: { borderRadius: borderRadius.sm },
    },
    math: {
      color: colors.text.primary,
      backgroundColor: colors.background.surface,
      fontSize: baseFontSize,
      padding: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      textAlign: "center",
    },
    inlineMath: { color: colors.text.primary },
    superscript: {},
    subscript: {},
    highlight: {
      color: colors.text.primary,
      backgroundColor: colors.background.surface,
    },
  };
}
