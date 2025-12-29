// app/(tabs)/contacts.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";

export default function ContactsTab() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Contactos</Text>
        <Text style={styles.sub}>
          Aquí verás las personas que te escriben o guardan tu perfil.
        </Text>

        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aún no hay contactos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, padding: 16, paddingTop: 18 },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "900", color: TEXT },
  sub: { color: MUTED, lineHeight: 18 },
  empty: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FBFCFF",
    alignItems: "center",
  },
  emptyText: { color: MUTED, fontWeight: "700" },
});
