// app/(tabs)/_layout.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 62,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
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
              size={size}
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
              size={size}
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
              size={size}
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
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
