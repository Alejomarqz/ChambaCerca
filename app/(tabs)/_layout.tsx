// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import {
  Camera,
  ChatsCircle,
  House,
  SlidersHorizontal,
  SquaresFour,
} from "phosphor-react-native";
import React from "react";
import { Platform } from "react-native";

const ACTIVE = "#2f49c6";
const INACTIVE = "#9AA7BD";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,

        // ✅ MÁS ARRIBA (evita que se cubran)
        tabBarStyle: {
          height: Platform.OS === "android" ? 78 : 66,
          paddingTop: 10,
          paddingBottom: Platform.OS === "android" ? 20 : 12,
          borderTopWidth: 1,
          borderTopColor: "#E7ECF5",
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <House size={22} color={color} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />

      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contactos",
          tabBarIcon: ({ color, focused }) => (
            <ChatsCircle
              size={22}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="work-photos"
        options={{
          title: "Fotos",
          tabBarIcon: ({ color, focused }) => (
            <Camera size={22} color={color} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />

      <Tabs.Screen
        name="work"
        options={{
          title: "Oficios",
          tabBarIcon: ({ color, focused }) => (
            <SquaresFour
              size={22}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, focused }) => (
            <SlidersHorizontal
              size={22}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      {/* Ocultos del tab bar */}
      <Tabs.Screen name="debug" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
