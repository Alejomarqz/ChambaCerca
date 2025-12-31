// app/onboarding/set-pin.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setCheckpoint } from "../../storage/bootStorage";
import { enablePin, PIN_LENGTH } from "../../storage/pinStorage";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(420, width - 44);

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

export default function SetPinScreen() {
  const router = useRouter();

  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [saving, setSaving] = useState(false);

  const re = useMemo(() => new RegExp(`^\\d{${PIN_LENGTH}}$`), []);
  const valid1 = useMemo(() => re.test(pin1), [pin1, re]);
  const valid2 = useMemo(() => re.test(pin2), [pin2, re]);
  const canSave = valid1 && valid2 && pin1 === pin2 && !saving;

  const onSave = async () => {
    if (!valid1) return Alert.alert("PIN inválido", `Debe tener ${PIN_LENGTH} dígitos.`);
    if (!valid2) return Alert.alert("Confirmación", `Confirma tu PIN (${PIN_LENGTH} dígitos).`);
    if (pin1 !== pin2) return Alert.alert("No coincide", "Los PIN no coinciden.");

    try {
      setSaving(true);

      await enablePin(pin1);

      // ✅ checkpoint: pin creado
      await setCheckpoint("pin_done");

      // ✅ Primera vez: después del PIN SIEMPRE -> ROLE
      router.replace("/onboarding/role");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar el PIN.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.kicker}>SEGURIDAD</Text>
            <Text style={styles.title}>Configura tu PIN</Text>
            <Text style={styles.sub}>
              Crea un PIN de {PIN_LENGTH} dígitos para proteger tu cuenta.
            </Text>
          </View>

          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <Text style={styles.label}>Nuevo PIN</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="key-outline" size={18} color={ORANGE} />
              </View>
              <TextInput
                value={pin1}
                onChangeText={(t) => setPin1(t.replace(/[^\d]/g, "").slice(0, PIN_LENGTH))}
                placeholder={"•".repeat(PIN_LENGTH)}
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={PIN_LENGTH}
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Confirmar PIN</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={18} color={ORANGE} />
              </View>

              <TextInput
                value={pin2}
                onChangeText={(t) => setPin2(t.replace(/[^\d]/g, "").slice(0, PIN_LENGTH))}
                placeholder={"•".repeat(PIN_LENGTH)}
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={PIN_LENGTH}
                onSubmitEditing={onSave}
              />

              <Pressable onPress={onSave} disabled={!canSave} hitSlop={10}>
                <Ionicons
                  name="checkmark-circle"
                  size={26}
                  color={canSave ? ORANGE : "rgba(234,105,30,0.35)"}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={onSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSave && { opacity: 0.5 },
                pressed && canSave && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryTxt}>{saving ? "Guardando..." : "Guardar PIN"}</Text>
            </Pressable>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                Si lo olvidás, podrás cerrar sesión e iniciar de nuevo.
              </Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="arrow-back-outline" size={16} color={TEXT} />
              <Text style={styles.linkTxt}>Volver</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 18 : 26,
    alignItems: "center",
    justifyContent: "center",
  },
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
    gap: 10,
  },
  inputIcon: { width: 28, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 18,
    color: TEXT,
    padding: 0,
    letterSpacing: 8,
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },

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

  linkBtn: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  linkTxt: { fontFamily: "Poppins_500Medium", fontSize: 12.5, color: TEXT },
});
