// app/(tabs)/search.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(420, width - 36);

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";

const BLUE = "#2f49c6";
const ORANGE = "#ea691e";

type WorkerItem = {
  id: string;
  name: string;
  work: string;
  location: string;
  rating: number;
};

const MOCK: WorkerItem[] = [
  { id: "1", name: "Juan Pérez", work: "Electricista", location: "San Lucas Sacatepéquez", rating: 4.7 },
  { id: "2", name: "Carlos López", work: "Plomero", location: "Mixco", rating: 4.5 },
  { id: "3", name: "María Gómez", work: "Jardinera", location: "Villa Nueva", rating: 4.8 },
];

export default function SearchTab() {
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState("");
  const [filterWork, setFilterWork] = useState<"" | "Electricista" | "Plomero" | "Jardinera">("");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MOCK.filter((w) => {
      const okQ =
        !s ||
        w.name.toLowerCase().includes(s) ||
        w.work.toLowerCase().includes(s) ||
        w.location.toLowerCase().includes(s);
      const okF = !filterWork || w.work === filterWork;
      return okQ && okF;
    });
  }, [q, filterWork]);

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: Math.max(0, insets.top) }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.wrap, { maxWidth: MAX_W }]}>
          <View style={styles.header}>
            <Text style={styles.h1}>Buscar trabajadores</Text>
            <Text style={styles.sub}>Encuentra personas por oficio y ubicación.</Text>
          </View>

          {/* Buscador */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Ej: Electricista en San Lucas…"
              placeholderTextColor="#9AA7BD"
              style={styles.searchInput}
            />
            {!!q && (
              <Pressable onPress={() => setQ("")} style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.8 }]}>
                <Ionicons name="close" size={18} color={MUTED} />
              </Pressable>
            )}
          </View>

          {/* Filtros rápidos */}
          <View style={styles.filtersRow}>
            {(["", "Electricista", "Plomero", "Jardinera"] as const).map((t) => {
              const active = filterWork === t;
              return (
                <Pressable
                  key={t || "all"}
                  onPress={() => setFilterWork(t)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active && { backgroundColor: "rgba(47,73,198,0.12)", borderColor: "rgba(47,73,198,0.20)" },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.filterTxt, active && { color: BLUE }]}>{t ? t : "Todos"}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Lista */}
          <View style={{ marginTop: 10 }}>
            {items.map((w) => (
              <View key={w.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{w.name}</Text>
                  <Text style={styles.meta}>{w.work} · {w.location}</Text>

                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color={ORANGE} />
                    <Text style={styles.ratingTxt}>{w.rating.toFixed(1)}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    // aquí luego: crear/abrir thread en contacts y navegar a /contacts/[id]
                    // por ahora: placeholder
                    console.log("contactar", w.id);
                  }}
                  style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                  <Text style={styles.contactTxt}>Contactar</Text>
                </Pressable>
              </View>
            ))}

            {items.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={22} color={ORANGE} />
                <Text style={styles.emptyTxt}>No hay resultados con esos filtros.</Text>
              </View>
            )}
          </View>

          <View style={{ height: 18 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, alignItems: "center" },
  wrap: { width: "100%" },

  header: { marginBottom: 12 },
  h1: { fontFamily: "Poppins_700Bold", fontSize: 20, color: TEXT },
  sub: { marginTop: 4, fontFamily: "Poppins_400Regular", fontSize: 12.5, color: MUTED, lineHeight: 16 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontFamily: "Poppins_500Medium", fontSize: 13.5, color: TEXT, padding: 0 },
  clearBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,18,32,0.04)", borderWidth: 1, borderColor: "rgba(11,18,32,0.06)" },

  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    backgroundColor: "rgba(11,18,32,0.02)",
  },
  filterTxt: { fontFamily: "Poppins_700Bold", fontSize: 12.5, color: TEXT },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  name: { fontFamily: "Poppins_700Bold", fontSize: 14.5, color: TEXT },
  meta: { marginTop: 2, fontFamily: "Poppins_400Regular", fontSize: 12.5, color: MUTED },
  ratingRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  ratingTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 12.5, color: TEXT },

  contactBtn: {
    backgroundColor: BLUE,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactTxt: { fontFamily: "Poppins_700Bold", color: "#fff", fontSize: 12.8 },

  empty: {
    marginTop: 14,
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    backgroundColor: "rgba(11,18,32,0.03)",
  },
  emptyTxt: { fontFamily: "Poppins_500Medium", color: MUTED, textAlign: "center" },
});
