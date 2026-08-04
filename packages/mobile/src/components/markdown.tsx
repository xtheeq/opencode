import { Linking } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { useTheme } from "@/theme";
import { markdownTheme } from "@/theme/markdown";

const SELECTION_MENU_CONFIG = {
  copyAsMarkdown: { enabled: false },
  copyImageUrl: { enabled: false },
};

const MD4C_FLAGS = {
  highlight: true,
  superscript: true,
  subscript: false,
  underline: false,
};

export function MarkdownPart({
  text,
  baseFontSize,
}: {
  text: string;
  baseFontSize: number;
}) {
  const { colors } = useTheme();
  const style = markdownTheme(colors, baseFontSize);

  return (
    <EnrichedMarkdownText
      markdown={text}
      flavor="github"
      streamingAnimation
      selectable
      selectionHandleColor={colors.action.primary}
      selectionColor={colors.action.primary + "33"}
      maxFontSizeMultiplier={1.5}
      spoilerOverlay="solid"
      selectionMenuConfig={SELECTION_MENU_CONFIG}
      md4cFlags={MD4C_FLAGS}
      onLinkPress={({ url }) => {
        Linking.canOpenURL(url)
          .then((ok) => {
            if (ok) return Linking.openURL(url);
          })
          .catch(() => {});
      }}
      markdownStyle={style}
    />
  );
}
