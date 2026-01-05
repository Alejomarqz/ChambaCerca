// app/pin.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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

import {
  logoutAndUnlock,
  PIN_LENGTH,
  verifyAndUnlock, // ✅ NUEVO (usa esto)
} from "../storage/pinStorage";

const { width } = Dimensions.get("window");

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

const MAX_W = Math.min(420, width - 44);
const MAX_TRIES = 5;

// ✅ debe coincidir con app/index.tsx
const KEY_PIN_RETURN_TO = "chamba_pin_return_to";

export default function PinScreen() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState<string>("");
  const [checking, setChecking] = useState(false);

  const canSubmit = useMemo(
    () => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin),
    [pin]
  );

  const hardLogout = useCallback(async () => {
    await logoutAndUnlock();
    router.replace("/onboarding/login");
  }, [router]);

  const goAfterUnlock = useCallback(async () => {
    // ✅ lee destino set por app/index.tsx
    const next = (await AsyncStorage.getItem(KEY_PIN_RETURN_TO)) || "/(tabs)";
    await AsyncStorage.removeItem(KEY_PIN_RETURN_TO);

    router.replace(next);
  }, [router]);

  const runVerify = useCallback(
    async (value: string) => {
      if (checking) return;
      setChecking(true);
      setMsg("");

      // ✅ Una sola operación: verifica + desbloquea + refresca actividad
      const ok = await verifyAndUnlock(value);

      if (ok) {
        await goAfterUnlock();
        return;
      }

      const nextTries = tries + 1;
      setTries(nextTries);
      setMsg("PIN incorrecto");
      setPin("");

      setChecking(false);

      if (nextTries >= MAX_TRIES) {
        setTimeout(() => {
          hardLogout();
        }, 250);
      }
    },
    [checking, tries, hardLogout, goAfterUnlock]
  );

  useEffect(() => {
    if (pin.length === PIN_LENGTH && canSubmit) {
      runVerify(pin);
    }
  }, [pin, canSubmit, runVerify]);

  const triesLeft = Math.max(0, MAX_TRIES - tries);

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
            <Text style={styles.title}>Desbloquear</Text>
            <Text style={styles.sub}>Ingresa tu PIN para continuar.</Text>
          </View>

          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <Text style={styles.label}>PIN</Text>

            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={18} color={ORANGE} />
              </View>

              <TextInput
                value={pin}
                onChangeText={(t) => {
                  setMsg("");
                  setPin(t.replace(/[^\d]/g, "").slice(0, PIN_LENGTH));
                }}
                placeholder={"•".repeat(PIN_LENGTH)}
                placeholderTextColor="#9AA7BD"
                style={styles.input}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={PIN_LENGTH}
                editable={!checking && tries < MAX_TRIES}
              />

              <View style={{ width: 26, alignItems: "flex-end" }}>
                {checking ? (
                  <Ionicons name="time-outline" size={20} color={MUTED} />
                ) : (
                  <Ionicons
                    name={canSubmit ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={canSubmit ? ORANGE : "rgba(11,18,32,0.25)"}
                  />
                )}
              </View>
            </View>

            {msg ? (
              <Text style={styles.msgErr}>{msg}</Text>
            ) : (
              <Text style={styles.helper}>
                Intentos restantes:{" "}
                <Text style={styles.helperStrong}>
                  {triesLeft}/{MAX_TRIES}
                </Text>
              </Text>
            )}

            <View style={styles.row}>
              <Pressable
                onPress={hardLogout}
                style={({ pressed }) => [
                  styles.linkBtn,
                  pressed && { opacity: 0.85 },
                ]}
                disabled={checking}
              >
                <Ionicons name="log-out-outline" size={16} color={TEXT} />
                <Text style={styles.linkTxt}>Cerrar sesión</Text>
              </Pressable>
            </View>

            <View style={styles.note}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={MUTED}
              />
              <Text style={styles.noteTxt}>
                Si olvidaste tu PIN, cierra sesión e inicia de nuevo.
              </Text>
            </View>
          </View>

          {tries >= MAX_TRIES ? (
            <Text style={styles.lockedTxt}>
              Por seguridad se cerrará la sesión…
            </Text>
          ) : null}
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

  helper: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
  },
  helperStrong: { fontFamily: "Poppins_600SemiBold", color: TEXT },

  msgErr: {
    marginTop: 10,
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: "#e53935",
  },

  row: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  linkBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  linkTxt: { fontFamily: "Poppins_500Medium", fontSize: 12.5, color: TEXT },

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

  lockedTxt: {
    marginTop: 14,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
  },
});
