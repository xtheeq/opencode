import { Children, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Text } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";

export type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type ToolStatus = "streaming" | "running" | "completed" | "error";

export function BasicTool({
  icon: Icon,
  title,
  subtitle,
  args,
  status,
  defaultOpen = false,
  allowOpenWhilePending = false,
  children,
}: {
  icon: IconComponent;
  title: string;
  subtitle?: string;
  args?: string[];
  status?: ToolStatus;
  defaultOpen?: boolean;
  allowOpenWhilePending?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const pending = status === "streaming" || status === "running";
  const hasChildren = Children.count(children) > 0;
  const expandable = hasChildren;
  const interactive = expandable && (!pending || allowOpenWhilePending);
  const hasMeta = subtitle !== undefined || (args?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <Pressable
        disabled={!interactive}
        onPress={() => setOpen((value) => !value)}
        hitSlop={4}
        accessibilityRole={interactive ? "button" : undefined}
        accessibilityState={interactive ? { expanded: open } : undefined}
        style={({ pressed }) => [styles.trigger, pressed && interactive && styles.pressed]}
      >
        <View style={styles.iconWrap}>
          <Icon size={14} color={colors.text.secondary} />
        </View>
        <View style={styles.column}>
          <View style={styles.titleRow}>
            <Text
              variant="label"
              color="primary"
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            {pending && <ActivityIndicator size={12} color={colors.text.secondary} />}
          </View>
          {hasMeta && (
            <View style={styles.metaColumn}>
              {subtitle !== undefined && (
                <Text
                  variant="caption"
                  color="secondary"
                  numberOfLines={1}
                  style={styles.subtitle}
                >
                  {subtitle}
                </Text>
              )}
              {(args?.length ?? 0) > 0 && (
                <View style={styles.argsRow}>
                  {(args ?? []).map((arg) => (
                    <Text
                      key={arg}
                      variant="caption"
                      color="secondary"
                      numberOfLines={1}
                      style={styles.arg}
                    >
                      {arg}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
        {interactive &&
          (open ? (
            <ChevronDown size={14} color={colors.text.secondary} />
          ) : (
            <ChevronRight size={14} color={colors.text.secondary} />
          ))}
      </Pressable>
      {open && expandable && (
        <View
          style={[
            styles.content,
            { borderLeftColor: colors.border.default },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 20,
    alignItems: "center",
    marginRight: spacing.xs,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
  metaColumn: {
    marginTop: 2,
    gap: 2,
  },
  subtitle: {
    flexShrink: 1,
  },
  argsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  arg: {
    fontVariant: ["tabular-nums"],
  },
  content: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
  },
});
