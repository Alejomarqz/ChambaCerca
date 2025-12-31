// app/(tabs)/settings.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    checkCurrentPin,
    disablePin,
    getBootFlags,
    PIN_LENGTH,
} from "../../storage/pinStorage";

const { width } = Dimensions.get("window");
const MAX_W = Math.min(480, width - 36);

const BG = "#FFFFFF";
const CARD = "#F7F8FC";
const BORDER = "#E7ECF5";
const TEXT = "#0B1220";
const MUTED = "#4F5D73";
const ACC = "#2f49c6";
const ORANGE = "#ea691e";
const DANGER = "#e53935";

type GateMode = null | "change" | "disable";

export default function SettingsScreen() {
  const router = useRouter();

  const [pinEnabled, setPinEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // gate modal
  const [gateMode, setGateMode] = useState<GateMode>(null);
  const [gatePin, setGatePin] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [gateBusy, setGateBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const boot = await getBootFlags();
      setPinEnabled(boot.pinEnabled);
      setLocked(boot.locked);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const statusText = useMemo(() => {
    if (loading) return "Cargando…";
    if (!pinEnabled) return "Desactivado";
    return locked ? "Activado (bloqueado)" : "Activado";
  }, [loading, pinEnabled, locked]);

  const openGate = (mode: Exclude<GateMode, null>) => {
    setGateMode(mode);
    setGatePin("");
    setGateErr("");
    setGateBusy(false);
  };

  const closeGate = () => {
    setGateMode(null);
    setGatePin("");
    setGateErr("");
    setGateBusy(false);
  };

  const onEnable = () => {
    router.push("/onboarding/set-pin");
  };

  const onConfirmGate = async () => {
    if (gateBusy) return;

    const re = new RegExp(`^\\d{${PIN_LENGTH}}$`);
    if (!re.test(gatePin)) {
      setGateErr(`Debe tener ${PIN_LENGTH} dígitos.`);
      return;
    }

    setGateBusy(true);
    setGateErr("");

    const ok = await checkCurrentPin(gatePin);
    if (!ok) {
      setGateBusy(false);
      setGateErr("PIN incorrecto.");
      setGatePin("");
      return;
    }

    if (gateMode === "change") {
      closeGate();
      router.push("/onboarding/set-pin");
      return;
    }

    if (gateMode === "disable") {
      closeGate();
      Alert.alert("Desactivar PIN", "¿Seguro que quieres desactivar el PIN?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: async () => {
            await disablePin();
            await load();
            Alert.alert("Listo", "PIN desactivado.");
          },
        },
      ]);
      return;
    }

    setGateBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ✅ Contenedor centrado vertical */}
      <View style={styles.centerStage}>
        <View style={styles.block}>
          <View style={styles.top}>
            <Text style={styles.title}>Ajustes</Text>
            <Text style={styles.sub}>Configura tu seguridad y preferencias.</Text>
          </View>

          <View style={[styles.card, { maxWidth: MAX_W }]}>
            <View style={styles.rowTop}>
              <View style={styles.rowLeft}>
                <View style={styles.iconBubble}>
                  <Ionicons name="lock-closed-outline" size={18} color={ORANGE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>PIN de ingreso</Text>
                  <Text style={styles.rowDesc}>Protege tu cuenta al abrir la app.</Text>
                </View>
              </View>

              <Text style={styles.badge}>{statusText}</Text>
            </View>

            {!pinEnabled ? (
              <Pressable
                onPress={onEnable}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="key-outline" size={16} color="#fff" />
                <Text style={styles.primaryTxt}>Activar PIN</Text>
              </Pressable>
            ) : (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => openGate("change")}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="refresh-outline" size={16} color={TEXT} />
                  <Text style={styles.secondaryTxt}>Cambiar PIN</Text>
                </Pressable>

                <Pressable
                  onPress={() => openGate("disable")}
                  style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#fff" />
                  <Text style={styles.dangerTxt}>Desactivar</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={MUTED} />
              <Text style={styles.noteTxt}>
                Cuando el PIN está activado, se solicitará al abrir la app y al regresar desde segundo plano.
              </Text>
            </View>

            <View style={styles.futureBox}>
              <Text style={styles.futureTitle}>Próximamente</Text>
              <Text style={styles.futureTxt}>
                Recuperación por código SMS (número de teléfono verificado).
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ====== MODAL: pedir PIN actual ====== */}
      <Modal visible={gateMode !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar PIN</Text>
            <Text style={styles.modalSub}>
              Ingresa tu PIN actual ({PIN_LENGTH} dígitos) para continuar.
            </Text>

            <View style={styles.modalInputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={ORANGE} />
              <TextInput
                value={gatePin}
                onChangeText={(t) => {
                  setGateErr("");
                  setGatePin(t.replace(/[^\d]/g, "").slice(0, PIN_LENGTH));
                }}
                placeholder={"•".repeat(PIN_LENGTH)}
                placeholderTextColor="#9AA7BD"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={PIN_LENGTH}
                style={styles.modalInput}
                editable={!gateBusy}
                onSubmitEditing={onConfirmGate}
              />
            </View>

            {!!gateErr && <Text style={styles.modalErr}>{gateErr}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeGate}
                style={({ pressed }) => [styles.modalBtnGhost, pressed && { opacity: 0.9 }]}
                disabled={gateBusy}
              >
                <Text style={styles.modalBtnGhostTxt}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={onConfirmGate}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  pressed && { opacity: 0.9 },
                  gateBusy && { opacity: 0.7 },
                ]}
                disabled={gateBusy}
              >
                <Text style={styles.modalBtnPrimaryTxt}>
                  {gateBusy ? "Verificando…" : "Continuar"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.modalHint}>(Más adelante podrás usar código por teléfono)</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // ✅ Esto centra verticalmente la sección en la pantalla
  centerStage: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  // ✅ “Block” limita ancho y mantiene todo alineado como tu diseño
  block: {
    width: "100%",
    maxWidth: MAX_W,
  },

  top: { width: "100%", marginBottom: 14 },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: TEXT,
    marginBottom: 4,
  },
  sub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  card: {
    width: "100%",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  rowTop: { gap: 10 },
  rowLeft: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(234,105,30,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.20)",
  },
  rowTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: TEXT },
  rowDesc: { fontFamily: "Poppins_400Regular", fontSize: 12, color: MUTED },

  badge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(47,73,198,0.10)",
    borderWidth: 1,
    borderColor: "rgba(47,73,198,0.18)",
    color: ACC,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: ACC,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" },

  actions: { marginTop: 14, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  secondaryBtn: {
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
  secondaryTxt: { fontFamily: "Poppins_500Medium", fontSize: 12.5, color: TEXT },

  dangerBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: DANGER,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  dangerTxt: { fontFamily: "Poppins_600SemiBold", fontSize: 12.5, color: "#fff" },

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

  futureBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(234,105,30,0.08)",
    borderWidth: 1,
    borderColor: "rgba(234,105,30,0.16)",
  },
  futureTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: TEXT,
    marginBottom: 4,
  },
  futureTxt: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },

  // ===== modal =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  modalTitle: { fontFamily: "Poppins_700Bold", fontSize: 18, color: TEXT },
  modalSub: {
    marginTop: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 17,
  },
  modalInputWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: TEXT,
    letterSpacing: 10,
    padding: 0,
  },
  modalErr: {
    marginTop: 8,
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: DANGER,
  },
  modalActions: { marginTop: 12, flexDirection: "row", gap: 10 },
  modalBtnGhost: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,18,32,0.05)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
  },
  modalBtnGhostTxt: { fontFamily: "Poppins_600SemiBold", color: TEXT },
  modalBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACC,
  },
  modalBtnPrimaryTxt: { fontFamily: "Poppins_600SemiBold", color: "#fff" },
  modalHint: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: MUTED,
    textAlign: "center",
  },
});
