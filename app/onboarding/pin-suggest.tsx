// app/onboarding/pin-suggest.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setCheckpoint } from "../../storage/bootStorage";
import { getBootFlags } from "../../storage/pinStorage";

const ORANGE = "#ea691e";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const BG = "#FFFFFF";
const CARD_BG = "#F7F8FC";
const CARD_BORDER = "#E7ECF5";

export default function PinSuggest() {
  const [checking, setChecking] = useState(true);

  const checkPin = useCallback(async () => {
    try {
      setChecking(true);
      const boot = await getBootFlags();

      // ✅ Si ya activó el PIN, seguimos al flujo correcto
      if (boot.pinEnabled) {
        await setCheckpoint("pin_done");
        router.replace("/onboarding/role");
        return;
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkPin();
  }, [checkPin]);

  useFocusEffect(
    useCallback(() => {
      checkPin();
    }, [checkPin])
  );

  const goEnablePin = useCallback(async () => {
    // ✅ La pantalla correcta para CREAR el PIN
    router.push("/onboarding/set-pin");
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.kicker}>SEGURIDAD</Text>
          <Text style={styles.title}>Protegé tu cuenta</Text>
          <Text style={styles.sub}>
            Para continuar, debes activar un PIN. Así nadie entra a tu cuenta si
            te prestan el teléfono.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={ORANGE}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>PIN de seguridad</Text>
              <Text style={styles.cardSub}>
                Te lo pediremos al abrir la app (reinicio) o cuando vuelvas
                después de un rato.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primary,
              pressed && { opacity: 0.9 },
            ]}
            onPress={goEnablePin}
          >
            <Text style={styles.primaryText}>Activar PIN</Text>
          </Pressable>

          {checking ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={ORANGE} />
              <Text style={styles.small}>Verificando PIN...</Text>
            </View>
          ) : (
            <Text style={styles.note}>
              * No podrás continuar hasta activar tu PIN.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  wrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    justifyContent: "center",
  },

  header: { marginBottom: 14 },
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
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 14,
  },

  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(234,105,30,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: TEXT,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
    color: MUTED,
  },

  primary: {
    marginTop: 14,
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
    fontSize: 14.5,
  },

  row: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  small: { fontFamily: "Poppins_400Regular", color: MUTED, fontSize: 12 },

  note: {
    marginTop: 12,
    fontFamily: "Poppins_400Regular",
    color: "#7C879B",
    fontSize: 11.5,
    textAlign: "center",
  },
});
