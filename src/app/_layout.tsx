import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      {/* Screens use a fixed white background, so icons must always be dark. */}
      <StatusBar style="dark" hidden={false} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, title: "Default Settings" }}
        />
      </Stack>
    </>
  );
}
