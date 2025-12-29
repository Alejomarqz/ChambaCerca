// app/onboarding/seeker-form.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

const MAX_W = Math.min(420, width - 44);

type AvailabilityKey = "manana" | "tarde" | "noche" | "fin";

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

// ✅ KEYS que el Home lee
const KEY_WORKER = "seeker-worker-profile";
const KEY_ROLE = "chamba_role";

export default function SeekerForm() {
  const router = useRouter();

  const [trade, setTrade] = useState<string>("");
  const [availability, setAvailability] = useState<AvailabilityKey[]>(["manana"]);

  const canSubmit = useMemo(() => trade.trim().length >= 2, [trade]);

  const toggle = (k: AvailabilityKey) => {
    setAvailability((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      return next.length ? next : ["manana"]; // nunca queda vacío
    });
  };

  const prettyAvail = (arr: AvailabilityKey[]) => {
    const map: Record<AvailabilityKey, string> = {
      manana: "Mañana",
      tarde: "Tarde",
      noche: "Noche",
      fin: "Fin de semana",
    };
    return arr.map((k) => map[k]).join(", ");
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert("Completa tu oficio", "Escribe qué oficio haces.");
      return;
    }

    const oficio = trade.trim();

    const payload = {
      work: oficio, // ✅ IMPORTANTE: Home busca worker.work/oficio/job
      trade_raw: oficio,
      availability,
      updatedAt: new Date().toISOString(),
    };

    console.log("[seeker-worker-profile]", payload);

    try {
      // ✅ 1) Guardar oficio + disponibilidad en el key que Home lee
      await AsyncStorage.setItem(KEY_WORKER, JSON.stringify(payload));

      // ✅ 2) Asegurar rol worker (este form es para quien busca trabajo)
      await AsyncStorage.setItem(KEY_ROLE, "worker");

      // ✅ 3) Ir al Home (tabs) para ver el perfil ya con oficio
      router.replace("/(tabs)");
    } catch (e) {
      console.log("[seeker-form-save-error]", e);
      Alert.alert("Error", "No se pudo guardar tu oficio. Intenta de nuevo.");
    }
  };

  const primaryLabel = canSubmit
    ? "Guardar y continuar"
    : "Completa el oficio para continuar";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { flexGrow: 1, justifyContent: "center" },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backChip,
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={18} color={TEXT} />
              <Text style={styles.backChipTxt}>Regresar</Text>
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.kicker}>BUSCO TRABAJO</Text>
            <Text style={styles.title}>Tu oficio</Text>
            <Text style={styles.sub}>
              Completa tu perfil de trabajador. Tu nombre y zona ya están guardados.
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <Text style={styles.label}>¿Qué oficio haces?</Text>

            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="construct-outline" size={18} color={ORANGE} />
              </View>

              <TextInput
                value={trade}
                onChangeText={setTrade}
                placeholder="Ej: Albañil, electricista, niñera…"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.helper}>
              Escribe solo tu oficio. Ej: “Albañil” o “Electricista”.
            </Text>

            <View style={{ height: 14 }} />

            <Text style={styles.sectionTitle}>Disponibilidad</Text>

            <View style={styles.chipsRow}>
              <Chip
                label="Mañana"
                active={availability.includes("manana")}
                onPress={() => toggle("manana")}
              />
              <Chip
                label="Tarde"
                active={availability.includes("tarde")}
                onPress={() => toggle("tarde")}
              />
              <Chip
                label="Noche"
                active={availability.includes("noche")}
                onPress={() => toggle("noche")}
              />
              <Chip
                label="Fin de semana"
                active={availability.includes("fin")}
                onPress={() => toggle("fin")}
              />
            </View>

            <Text style={styles.hint}>
              Seleccionado:{" "}
              <Text style={styles.hintStrong}>{prettyAvail(availability)}</Text>
            </Text>

            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                No publicamos ofertas. Solo tu perfil para que te contacten directo.
              </Text>
            </View>
          </View>

          {/* CTA */}
          <View style={[styles.ctaWrap, { maxWidth: MAX_W }]}>
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSubmit && styles.primaryDisabled,
                pressed && canSubmit ? styles.primaryPressed : null,
              ]}
            >
              <Text style={styles.primaryTxt}>{primaryLabel}</Text>
            </Pressable>

            <Text style={styles.micro}>Podrás editar esto después.</Text>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  content: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 10 : 18,
    paddingBottom: 22,
    alignItems: "center",
  },

  topRow: { width: "100%", maxWidth: MAX_W, marginBottom: 10 },

  backChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
  },
  backChipTxt: { fontFamily: "Poppins_500Medium", fontSize: 13, color: TEXT },

  header: { width: "100%", maxWidth: MAX_W, marginBottom: 12 },

  kicker: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#7C879B",
    letterSpacing: 1.1,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: TEXT,
    marginBottom: 6,
  },

  sub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },

  card: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 14,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#0B1220",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 0 },
    }),
  },

  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: TEXT,
    marginBottom: 6,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  inputIcon: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: TEXT,
    padding: 0,
  },

  helper: {
    marginTop: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#7C879B",
  },

  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: TEXT,
    marginBottom: 8,
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  chip: {
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
  },

  chipActive: {
    backgroundColor: "rgba(234,105,30,0.12)",
    borderColor: "rgba(234,105,30,0.28)",
  },

  chipTxt: { fontFamily: "Poppins_500Medium", fontSize: 12.5, color: TEXT },

  chipTxtActive: { color: TEXT },

  hint: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  hintStrong: { fontFamily: "Poppins_600SemiBold", color: TEXT },

  note: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(11,18,32,0.04)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.06)",
  },

  noteTxt: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },

  ctaWrap: { width: "100%", marginTop: 14, alignItems: "center" },

  primaryBtn: {
    width: "100%",
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryPressed: { opacity: 0.95, transform: [{ scale: 0.992 }] },

  primaryDisabled: { backgroundColor: "rgba(234,105,30,0.45)" },

  primaryTxt: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    fontSize: 14.5,
  },

  micro: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#7C879B",
    textAlign: "center",
  },
});
