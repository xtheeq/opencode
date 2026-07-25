import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MessageTimeline } from "@/components/message-timeline";
import { PromptInput } from "@/components/prompt-input";
import { KeyboardView } from "@/components/keyboard-view";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <KeyboardView>
      <View style={{ flex: 1 }}>
        <MessageTimeline sessionID={id} />
      </View>
      <PromptInput sessionID={id} />
    </KeyboardView>
  );
}
