import { useRef, useState } from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import { connect } from "@/services/connection";
import { parsePairing } from "@/utils/pairing";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Button, Text } from "@/components/primitives";

export function QrScanner() {
  const { colors } = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const accepted = useRef(false);
  const [invalid, setInvalid] = useState(false);
  const [mountError, setMountError] = useState<string>();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text variant="heading">Camera access needed</Text>
        <Text variant="body" color="secondary" style={styles.message}>
          {permission.canAskAgain
            ? "OpenCode uses the camera only to scan server login QR codes."
            : "Camera access was denied. Enable it in Settings to scan login QR codes."}
        </Text>
        <Button
          title={
            permission.canAskAgain ? "Allow camera access" : "Open Settings"
          }
          onPress={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
        />
      </View>
    );
  }

  const scan = ({ data }: BarcodeScanningResult) => {
    const pairing = parsePairing(data);
    if (!pairing) {
      setInvalid(true);
      return;
    }
    if (accepted.current) return;
    accepted.current = true;
    setHandled(true);
    connect(pairing.url, pairing.password);
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.media }]}
    >
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handled ? undefined : scan}
        onMountError={({ message }) => setMountError(message)}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text variant="label" color="onMedia">
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <View style={[styles.reticle, { borderColor: colors.text.onMedia }]} />
      </View>
      <Text variant="caption" color="onMedia" style={styles.hint}>
        {mountError ??
          (invalid
            ? "That is not an OpenCode login code"
            : "Point the camera at the QR code shown by OpenCode")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  message: {
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
  },
  hint: {
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
