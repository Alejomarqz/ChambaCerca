// app/settings/pin.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
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

import {
    PIN_LENGTH,
    checkCurrentPin,
    disablePin,
    enablePin,
    isPinEnabled,
    setAppLocked,
} from "../../storage/pinStorage";

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

const KEY_PIN_AFTER_ENABLE = "chamba_pin_after_enable"; // destino post activación

function onlyDigitsMax(t: string) {
  return t.replace(/[^\d]/g, "").slice(0, PIN_LENGTH);
}

export default function SettingsPinScreen() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [current, setCurrent] = useState("");

  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await isPinEnabled();
      setEnabled(v);
    })();
  }, []);

  const valid1 = useMemo(() => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin1), [pin1]);
  const valid2 = useMemo(() => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin2), [pin2]);
  const validCurrent = useMemo(() => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(current), [current]);

  const canCreate = valid1 && valid2 && pin1 === pin2;
  const canDisable = validCurrent;

  const refreshEnabled = async () => {
    const v = await isPinEnabled();
    setEnabled(v);
  };

  const handleCreate = async () => {
    if (busy) return;
    setMsg("");

    if (!canCreate) {
      setMsg(pin1 !== pin2 ? "Los PIN no coinciden" : "Ingresa y confirma tu PIN");
      return;
    }

    setBusy(true);
    try {
      await enablePin(pin1);

      // ✅ IMPORTANTE: al crearlo NO debe quedar “locked”
      await setAppLocked(false);

      await refreshEnabled();
      setMsg("PIN activado ✅");

      // ✅ PRIMERA VEZ: ir directo al flujo (ROLE), NO al Gate "/"
      const next =
        (await AsyncStorage.getItem(KEY_PIN_AFTER_ENABLE)) || "/onboarding/role";
      await AsyncStorage.removeItem(KEY_PIN_AFTER_ENABLE);

      setTimeout(() => router.replace(next as any), 250);
    } catch {
      setMsg("No se pudo activar el PIN");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (busy) return;
    setMsg("");

    if (!canDisable) {
      setMsg("Ingresa tu PIN actual");
      return;
    }

    setBusy(true);
    try {
      const ok = await checkCurrentPin(current);
      if (!ok) {
        setMsg("PIN actual incorrecto");
        setBusy(false);
        return;
      }

      await disablePin();
      await setAppLocked(false);

      setCurrent("");
      await refreshEnabled();
      setMsg("PIN desactivado ✅");

      // al desactivar, volvemos normal
      setTimeout(() => router.back(), 250);
    } catch {
      setMsg("No se pudo desactivar el PIN");
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>PIN de seguridad</Text>
            <Text style={styles.sub}>
              {enabled
                ? "Tu PIN está activo. Puedes desactivarlo ingresando el PIN actual."
                : "Crea un PIN de 6 dígitos para proteger tu cuenta."}
            </Text>
          </View>

          <View style={styles.card}>
            {!enabled ? (
              <>
                <Text style={styles.label}>Nuevo PIN</Text>
                <InputRow
                  value={pin1}
                  onChange={(t) => {
                    setMsg("");
                    setPin1(onlyDigitsMax(t));
                  }}
                />

                <Text style={[styles.label, { marginTop: 12 }]}>Confirmar PIN</Text>
                <InputRow
                  value={pin2}
                  onChange={(t) => {
                    setMsg("");
                    setPin2(onlyDigitsMax(t));
                  }}
                />

                {msg ? <Text style={msg.includes("✅") ? styles.msgOk : styles.msgErr}>{msg}</Text> : null}

                <Pressable
                  onPress={handleCreate}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.primary,
                    pressed && { opacity: 0.9 },
                    busy && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.primaryText}>{busy ? "Guardando..." : "Activar PIN"}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>PIN actual</Text>
                <InputRow
                  value={current}
                  onChange={(t) => {
                    setMsg("");
                    setCurrent(onlyDigitsMax(t));
                  }}
                />

                {msg ? <Text style={msg.includes("✅") ? styles.msgOk : styles.msgErr}>{msg}</Text> : null}

                <Pressable
                  onPress={handleDisable}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.danger,
                    pressed && { opacity: 0.9 },
                    busy && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.dangerText}>
                    {busy ? "Procesando..." : "Desactivar PIN"}
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}
              disabled={busy}
            >
              <Text style={styles.secondaryText}>Volver</Text>
            </Pressable>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                Usa un PIN que recuerdes. Si lo olvidas, tendrás que cerrar sesión e iniciar de nuevo.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputRow({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const ok = new RegExp(`^\\d{${PIN_LENGTH}}$`).test(value);

  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputIcon}>
        <Ionicons name="lock-closed-outline" size={18} color={ORANGE} />
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={"•".repeat(PIN_LENGTH)}
        placeholderTextColor="#9AA7BD"
        style={styles.input}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_LENGTH}
      />

      <View style={{ width: 26, alignItems: "flex-end" }}>
        <Ionicons
          name={ok ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={ok ? ORANGE : "rgba(11,18,32,0.25)"}
        />
      </View>
    </View>
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
  header: { width: "100%", maxWidth: 420, marginBottom: 12 },
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
    maxWidth: 420,
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
    letterSpacing: 10,
  },
  msgErr: { marginTop: 10, fontFamily: "Poppins_500Medium", fontSize: 12.5, color: "#e53935" },
  msgOk: { marginTop: 10, fontFamily: "Poppins_500Medium", fontSize: 12.5, color: "#2e7d32" },
  primary: { marginTop: 14, backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  primaryText: { fontFamily: "Poppins_600SemiBold", color: "#fff", fontSize: 14.5 },
  danger: { marginTop: 14, backgroundColor: "#e53935", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  dangerText: { fontFamily: "Poppins_600SemiBold", color: "#fff", fontSize: 14.5 },
  secondary: { marginTop: 10, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(11,18,32,0.10)", backgroundColor: "#fff" },
  secondaryText: { fontFamily: "Poppins_600SemiBold", color: TEXT, fontSize: 14.5 },
  note: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "rgba(11,18,32,0.04)", borderWidth: 1, borderColor: "rgba(11,18,32,0.06)" },
  noteTxt: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 12, color: MUTED, lineHeight: 16 },
});
