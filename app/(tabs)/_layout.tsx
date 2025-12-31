// app/(tabs)/_layout.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";

const KEY_LAST_ROUTE = "chamba_last_route";

export default function TabsLayout() {
  const pathname = usePathname();

  useEffect(() => {
    // Guardamos la última ruta SOLO dentro de tabs
    // Ej: "/(tabs)/profile", "/(tabs)/settings", etc.
    if (pathname && pathname.startsWith("/(tabs)")) {
      AsyncStorage.setItem(KEY_LAST_ROUTE, pathname).catch(() => {});
    }
  }, [pathname]);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: "#2f49c6",
        tabBarInactiveTintColor: "#9AA7BD",

        // ✅ subimos un poco la barra para que no se “corte”
        tabBarStyle: {
          height: Platform.OS === "android" ? 70 : 62,
          paddingTop: 1,
          paddingBottom: Platform.OS === "android" ? 16 : 10,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size ?? 22}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contactos",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              size={size ?? 22}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size ?? 22}
            />
          ),
        }}
      />

      {/* Debug temporal */}
      <Tabs.Screen
        name="debug"
        options={{
          title: "Debug",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bug" : "bug-outline"}
              color={color}
              size={size ?? 22}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              color={color}
              size={size ?? 22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
