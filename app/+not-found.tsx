import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ruta no encontrada</Text>
      <Text style={styles.subtitle}>Revisa tus pantallas en /app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#0B1220", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#5B6B84" },
});
