// app/onboarding/worker-form.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
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

export default function WorkerForm() {
  const router = useRouter();

  const [need, setNeed] = useState<string>("");
  const [zone, setZone] = useState<string>("");

  const canSubmit = useMemo(() => {
    return need.trim().length >= 2 && zone.trim().length >= 2;
  }, [need, zone]);

  const onSubmit = () => {
    if (!canSubmit) {
      Alert.alert("Completa los datos", "Escribe qué necesitas y tu zona.");
      return;
    }

    const payload = {
      need: need.trim(),
      zone: zone.trim(),
    };

    console.log("[worker-search]", payload);

    // Aquí lo ideal es navegar a una pantalla de resultados, por ejemplo:
    // router.push({ pathname: "/(tabs)", params: { q: payload.need, zone: payload.zone } })
    // Por ahora, mandamos al home/tabs.
    router.replace("/(tabs)");
  };

  const primaryLabel = canSubmit ? "Buscar perfiles" : "Completa los datos para buscar";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: "center" }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backChip, pressed && { opacity: 0.85 }]}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={18} color={TEXT} />
              <Text style={styles.backChipTxt}>Regresar</Text>
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.kicker}>NECESITO UN TRABAJADOR</Text>
            <Text style={styles.title}>Busca perfiles cerca</Text>
            <Text style={styles.sub}>
              Aquí no se publican ofertas. Solo buscas perfiles y los contactas directo.
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <Text style={styles.label}>¿Qué necesitas?</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="search-outline" size={18} color={ORANGE} />
              </View>
              <TextInput
                value={need}
                onChangeText={setNeed}
                placeholder="Ej: Albañil, electricista, niñera…"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                autoCapitalize="sentences"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.helper}>
              Escribe el oficio que buscas. Ej: “Albañil”.
            </Text>

            <View style={{ height: 12 }} />

            <Text style={styles.label}>Zona / lugar</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="location-outline" size={18} color={ORANGE} />
              </View>
              <TextInput
                value={zone}
                onChangeText={setZone}
                placeholder="Ej: San Lucas, Antigua, Zona 1…"
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>

            <View style={styles.note}>
              <Ionicons name="chatbubbles-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                Verás perfiles cercanos y podrás contactar directo por WhatsApp o llamada.
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

            <Text style={styles.micro}>Puedes cambiar esto después.</Text>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  title: { fontFamily: "Poppins_700Bold", fontSize: 22, color: TEXT, marginBottom: 6 },

  sub: { fontFamily: "Poppins_400Regular", fontSize: 13, lineHeight: 19, color: MUTED },

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

  label: { fontFamily: "Poppins_500Medium", fontSize: 12.5, color: TEXT, marginBottom: 6 },

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

  inputIcon: { width: 28, alignItems: "center", justifyContent: "center", marginRight: 6 },

  input: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 13.5, color: TEXT, padding: 0 },

  helper: { marginTop: 8, fontFamily: "Poppins_400Regular", fontSize: 12, color: "#7C879B" },

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

  noteTxt: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 12, color: MUTED, lineHeight: 16 },

  ctaWrap: { width: "100%", marginTop: 14, alignItems: "center" },

  primaryBtn: { width: "100%", backgroundColor: ORANGE, paddingVertical: 14, borderRadius: 14, alignItems: "center" },

  primaryPressed: { opacity: 0.95, transform: [{ scale: 0.992 }] },

  primaryDisabled: { backgroundColor: "rgba(234,105,30,0.45)" },

  primaryTxt: { fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 14.5 },

  micro: { marginTop: 10, fontFamily: "Poppins_400Regular", fontSize: 11.5, color: "#7C879B", textAlign: "center" },
});
