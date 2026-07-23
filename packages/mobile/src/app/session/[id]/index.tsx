import { useLocalSearchParams } from "expo-router";
import { MessageTimeline } from "@/components/message-timeline";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MessageTimeline sessionID={id} />;
}
