// app/(tabs)/profile.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const BG = "#F6F8FC";
const CARD = "#FFFFFF";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BORDER = "#E7ECF5";
const BLUE = "#2f49c6";

// ✅ KEYS OFICIALES (las mismas que leerá Home)
const KEY_BASIC = "basic-profile";
const KEY_WORKER = "seeker-worker-profile";

export default function ProfileTab() {
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [zone, setZone] = useState("");
  const [work, setWork] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const basicRaw = await AsyncStorage.getItem(KEY_BASIC);
        const workerRaw = await AsyncStorage.getItem(KEY_WORKER);

        const basic = basicRaw ? JSON.parse(basicRaw) : {};
        const worker = workerRaw ? JSON.parse(workerRaw) : {};

        setFirstName(basic.firstName || "");
        setLastName(basic.lastName || "");
        setWhatsapp(basic.whatsapp || "");
        setZone(basic.zone || "");
        setWork(worker.work || worker.oficio || worker.job || "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      const basic = { firstName, lastName, whatsapp, zone };
      const worker = { work };

      await AsyncStorage.setItem(KEY_BASIC, JSON.stringify(basic));
      await AsyncStorage.setItem(KEY_WORKER, JSON.stringify(worker));

      Alert.alert("Listo", "Tu perfil fue actualizado.");
    } catch {
      Alert.alert("Error", "No se pudo guardar. Intenta de nuevo.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ color: MUTED }}>Cargando perfil…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Mi perfil</Text>
        <Text style={styles.sub}>
          Edita tus datos. Esto NO es registro, solo actualizar.
        </Text>

        <Field label="Nombre" value={firstName} onChangeText={setFirstName} />
        <Field label="Apellido" value={lastName} onChangeText={setLastName} />
        <Field
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          placeholder="Ej: 5555-5555"
        />
        <Field label="Zona / Aldea" value={zone} onChangeText={setZone} placeholder="Ej: San Lucas" />

        <View style={styles.sep} />

        <Field label="Oficio" value={work} onChangeText={setWork} placeholder="Ej: Albañil, Electricista..." />

        <Pressable onPress={save} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
          <Text style={styles.btnText}>Guardar cambios</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9AA7BD"
        keyboardType={props.keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: {
    padding: 16,
    paddingTop: Platform.OS === "android" ? 12 : 18,
    paddingBottom: 28,
    backgroundColor: BG,
  },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "900", color: TEXT },
  sub: { color: MUTED, lineHeight: 18 },

  label: { fontSize: 12.5, fontWeight: "900", color: TEXT },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBFCFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 10 : 12,
    color: TEXT,
  },

  sep: { height: 1, backgroundColor: BORDER, marginVertical: 6 },

  btn: {
    marginTop: 6,
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
