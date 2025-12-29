// app/_layout.tsx
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState } from "react-native";

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
    // Si cargaron o fallaron, quitamos el splash nativo
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // ✅ Cerrar sesión al salir de la app (background/inactive)
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        await AsyncStorage.removeItem("chamba_session");
      }
    });

    return () => sub.remove();
  }, []);

  // Mientras no estén listas las fuentes (y no haya error), no renderizamos nada
  if (!fontsLoaded && !fontError) return null;

  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
