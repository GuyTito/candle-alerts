import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" hidden={false} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
