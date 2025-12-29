// app/(tabs)/debug.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const BLUE = "#2f49c6";

export default function DebugTab() {
  const [items, setItems] = useState<Array<{ key: string; value: string }>>([]);

  const load = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();

      // ✅ FIX TS: getAllKeys() puede venir como readonly string[]
      const sortedKeys = [...keys].sort();

      const pairs = await AsyncStorage.multiGet(sortedKeys);

      setItems(
        pairs.map(([k, v]) => ({
          key: k,
          value: v ?? "",
        }))
      );
    } catch (e) {
      Alert.alert("Error", "No se pudo leer AsyncStorage");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const clearAll = async () => {
    Alert.alert("Borrar todo", "¿Seguro? Esto borra todo el registro local.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          await load();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Debug · AsyncStorage</Text>
        <Text style={styles.sub}>
          Aquí ves exactamente qué datos están guardados (keys y valores).
        </Text>

        <View style={styles.row}>
          <Pressable onPress={load} style={styles.btn}>
            <Text style={styles.btnText}>Recargar</Text>
          </Pressable>
          <Pressable onPress={clearAll} style={[styles.btn, styles.btnDanger]}>
            <Text style={[styles.btnText, { color: "#fff" }]}>Borrar todo</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {items.length === 0 ? (
          <Text style={{ color: MUTED }}>No hay datos guardados.</Text>
        ) : (
          items.map((it) => (
            <View key={it.key} style={styles.item}>
              <Text style={styles.k}>{it.key}</Text>
              <Text style={styles.v} selectable>
                {it.value}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 16,
    margin: 16,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: "900", color: TEXT },
  sub: { color: MUTED, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    backgroundColor: "rgba(47,73,198,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,73,198,0.20)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnDanger: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  btnText: { fontWeight: "900", color: BLUE },
  item: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  k: { color: TEXT, fontWeight: "900" },
  v: { color: MUTED, fontSize: 12.5, lineHeight: 17 },
});
