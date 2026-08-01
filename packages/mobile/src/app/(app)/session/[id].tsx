import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  KeyboardGestureArea,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageTimeline } from "@/components/message-timeline";
import { PromptInput } from "@/components/prompt-input";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <KeyboardGestureArea interpolator="ios" style={{ flex: 1 }}>
        <MessageTimeline sessionID={id} />
      </KeyboardGestureArea>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <PromptInput sessionID={id} />
      </KeyboardStickyView>
    </View>
  );
}
