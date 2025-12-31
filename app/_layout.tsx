// app/_layout.tsx
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

// ✅ pinStorage con timeout inteligente
import { lockIfTimedOut, markBackgrounded } from "../storage/pinStorage";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: "index" };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Guardamos el estado previo para detectar transición a "active"
  const lastState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = lastState.current;
      lastState.current = nextState;

      // ✅ Cuando se va a background/inactive: SOLO marcar tiempo (no bloquear ya)
      if (nextState === "background" || nextState === "inactive") {
        markBackgrounded().catch(() => {});
        return;
      }

      // ✅ Cuando vuelve a active desde background/inactive: bloquear si ya pasó el tiempo
      if (
        nextState === "active" &&
        (prev === "background" || prev === "inactive")
      ) {
        lockIfTimedOut().catch(() => {});
      }
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}
