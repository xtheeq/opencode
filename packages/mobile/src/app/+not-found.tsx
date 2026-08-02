import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text variant="heading">This screen doesn&apos;t exist.</Text>
      <Link href="/" style={styles.link}>
        <Text color="primary">Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  link: {
    marginTop: spacing.sm,
  },
});
