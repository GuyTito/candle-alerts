import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" hidden={false} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, title: "Default Settings" }}
        />
      </Stack>
    </>
  );
}
